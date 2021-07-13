/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {ChildProcess, fork} from 'child_process';
import {PassThrough} from 'stream';
import mergeStream = require('merge-stream');
import {stdout as stdoutSupportsColor} from 'supports-color';
import {
  CHILD_MESSAGE_INITIALIZE,
  ChildMessage,
  HEARTBEAT_ERROR,
  OnCustomMessage,
  OnEnd,
  OnStart,
  PARENT_MESSAGE_CLIENT_ERROR,
  PARENT_MESSAGE_CUSTOM,
  PARENT_MESSAGE_HEARTBEAT,
  PARENT_MESSAGE_OK,
  PARENT_MESSAGE_SETUP_ERROR,
  ParentMessage,
  WorkerInterface,
  WorkerOptions,
} from '../types';

interface ErrorFrame {
  columnNumber: number;
  lineNumber: number;
  name: string;
  url: string;
}

const SIGNAL_BASE_EXIT_CODE = 128;
const SIGKILL_EXIT_CODE = SIGNAL_BASE_EXIT_CODE + 9;
const SIGTERM_EXIT_CODE = SIGNAL_BASE_EXIT_CODE + 15;

// How long to wait after SIGTERM before sending SIGKILL
const SIGKILL_DELAY = 500;

const CHILD_HEARTBEAT_INTERVAL = 1_000;

/**
 * This class wraps the child process and provides a nice interface to
 * communicate with. It takes care of:
 *
 *  - Re-spawning the process if it dies.
 *  - Queues calls while the worker is busy.
 *  - Re-sends the requests if the worker blew up.
 *
 * The reason for queueing them here (since childProcess.send also has an
 * internal queue) is because the worker could be doing asynchronous work, and
 * this would lead to the child process to read its receiving buffer and start a
 * second call. By queueing calls here, we don't send the next call to the
 * children until we receive the result of the previous one.
 *
 * As soon as a request starts to be processed by a worker, its "processed"
 * field is changed to "true", so that other workers which might encounter the
 * same call skip it.
 */
export default class ChildProcessWorker implements WorkerInterface {
  private _child!: ChildProcess;
  private _options: WorkerOptions;

  private _request: ChildMessage | null;
  private _retries!: number;
  private _onProcessEnd!: OnEnd;
  private _onCustomMessage!: OnCustomMessage;

  private _fakeStream: PassThrough | null;
  private _stdout: ReturnType<typeof mergeStream> | null;
  private _stderr: ReturnType<typeof mergeStream> | null;

  private _exitPromise: Promise<void>;
  private _resolveExitPromise!: () => void;

  private _heartbeatTimeout!: NodeJS.Timeout;

  constructor(options: WorkerOptions) {
    this._options = options;

    this._request = null;

    this._fakeStream = null;
    this._stdout = null;
    this._stderr = null;

    this._exitPromise = new Promise(resolve => {
      this._resolveExitPromise = resolve;
    });

    this.initialize();
  }

  initialize(): void {
    const forceColor = stdoutSupportsColor ? {FORCE_COLOR: '1'} : {};
    const child = fork(require.resolve('./processChild'), [], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        JEST_WORKER_ID: String(this._options.workerId + 1), // 0-indexed workerId, 1-indexed JEST_WORKER_ID
        ...forceColor,
      } as NodeJS.ProcessEnv,
      // Suppress --debug / --inspect flags while preserving others (like --harmony).
      execArgv: process.execArgv.filter(v => !/^--(debug|inspect)/.test(v)),
      silent: true,
      ...this._options.forkOptions,
    });

    if (child.stdout) {
      if (!this._stdout) {
        // We need to add a permanent stream to the merged stream to prevent it
        // from ending when the subprocess stream ends
        this._stdout = mergeStream(this._getFakeStream());
      }

      this._stdout.add(child.stdout);
    }

    if (child.stderr) {
      if (!this._stderr) {
        // We need to add a permanent stream to the merged stream to prevent it
        // from ending when the subprocess stream ends
        this._stderr = mergeStream(this._getFakeStream());
      }

      this._stderr.add(child.stderr);
    }

    child.on('message', this._onMessage.bind(this));
    child.on('exit', this._onExit.bind(this));

    child.send([
      CHILD_MESSAGE_INITIALIZE,
      false,
      this._options.workerPath,
      this._options.setupArgs,
      CHILD_HEARTBEAT_INTERVAL,
    ]);

    this._child = child;

    this._retries++;

    // If we exceeded the amount of retries, we will emulate an error reply
    // coming from the child. This avoids code duplication related with cleaning
    // the queue, and scheduling the next call.
    if (this._retries > this._options.maxRetries) {
      const error = new Error(
        `Jest worker encountered ${this._retries} child process exceptions, exceeding retry limit`,
      );

      this._onMessage([
        PARENT_MESSAGE_CLIENT_ERROR,
        error.name,
        error.message,
        error.stack!,
        {type: 'WorkerError'},
      ]);
    }
  }

  monitorHeartbeat(onExceeded: () => any): void {
    clearTimeout(this._heartbeatTimeout);
    this._heartbeatTimeout = setTimeout(() => {
      onExceeded();
    }, this._options.workerHeartbeatTimeout).unref();
  }

  private _shutdown() {
    // End the temporary streams so the merged streams end too
    if (this._fakeStream) {
      this._fakeStream.end();
      this._fakeStream = null;
    }

    this._resolveExitPromise();
  }

  private async monitorHeartbeatError() {
    if (this._heartbeatTimeout) {
      clearTimeout(this._heartbeatTimeout);
    }

    if (this._options.inspector) {
      const error = new Error(
        `Test worker was unresponsive for ${this._options.workerHeartbeatTimeout} milliseconds. There was an inspector connected so we were able to capture stack frames before it was terminated.`,
      );
      this._options.inspector.on('Debugger.paused', (message: any) => {
        const frames: Array<ErrorFrame> = [];
        const callFrames = message.params.callFrames.slice(0, 20);
        for (const callFrame of callFrames) {
          const loc = callFrame.location;

          const columnNumber = loc.columnNumber;
          const lineNumber = loc.lineNumber;
          const url = callFrame.url;

          const name = callFrame.scopeChain[0].name;

          frames.push({
            columnNumber,
            lineNumber,
            name,
            url,
          });
        }

        // @ts-expect-error: no index
        error.type = HEARTBEAT_ERROR;
        error.stack = JSON.stringify(frames);

        this._onProcessEnd(error, null);
      });

      await new Promise<void>((resolve, reject) => {
        this._options.inspector?.post('Debugger.pause', (err: Error) => {
          if (err === null) {
            resolve();
          } else {
            reject(err);
          }
        });
      });
    } else {
      const error = new Error(
        `Test worker was unresponsive for ${this._options.workerHeartbeatTimeout} milliseconds. There was no inspector connected so we were unable to capture stack frames before it was terminated.`,
      );
      // @ts-expect-error: no index
      error.type = HEARTBEAT_ERROR;

      this._onProcessEnd(error, null);
    }
  }

  private _onMessage(response: ParentMessage) {
    // TODO: Add appropriate type check
    let error: any;

    switch (response[0]) {
      case PARENT_MESSAGE_OK:
        this._onProcessEnd(null, response[1]);
        break;

      case PARENT_MESSAGE_CLIENT_ERROR:
        error = response[4];

        if (error != null && typeof error === 'object') {
          const extra = error;
          // @ts-expect-error: no index
          const NativeCtor = global[response[1]];
          const Ctor = typeof NativeCtor === 'function' ? NativeCtor : Error;

          error = new Ctor(response[2]);
          error.type = response[1];
          error.stack = response[3];

          for (const key in extra) {
            error[key] = extra[key];
          }
        }
        this._onProcessEnd(error, null);
        break;

      case PARENT_MESSAGE_SETUP_ERROR:
        error = new Error('Error when calling setup: ' + response[2]);

        error.type = response[1];
        error.stack = response[3];

        this._onProcessEnd(error, null);
        break;

      case PARENT_MESSAGE_HEARTBEAT:
        this.monitorHeartbeat(() => this.monitorHeartbeatError());
        break;
      case PARENT_MESSAGE_CUSTOM:
        this._onCustomMessage(response[1]);
        break;
      default:
        clearTimeout(this._heartbeatTimeout);
        throw new TypeError('Unexpected response from worker: ' + response[0]);
    }
  }

  private _onExit(exitCode: number | null) {
    if (
      exitCode !== 0 &&
      exitCode !== null &&
      exitCode !== SIGTERM_EXIT_CODE &&
      exitCode !== SIGKILL_EXIT_CODE
    ) {
      this.initialize();

      if (this._request) {
        this._child.send(this._request);
      }
    } else {
      this._shutdown();
      clearTimeout(this._heartbeatTimeout);
    }
  }

  send(
    request: ChildMessage,
    onProcessStart: OnStart,
    onProcessEnd: OnEnd,
    onCustomMessage: OnCustomMessage,
  ): void {
    onProcessStart(this);
    this._onProcessEnd = (...args) => {
      // Clean the request to avoid sending past requests to workers that fail
      // while waiting for a new request (timers, unhandled rejections...)
      this._request = null;
      return onProcessEnd(...args);
    };

    this._onCustomMessage = (...arg) => onCustomMessage(...arg);

    this._request = request;
    this._retries = 0;
    this._child.send(request, () => {});
  }

  waitForExit(): Promise<void> {
    return this._exitPromise;
  }

  forceExit(): void {
    this._child.kill('SIGTERM');
    const sigkillTimeout = setTimeout(
      () => this._child.kill('SIGKILL'),
      SIGKILL_DELAY,
    );
    this._exitPromise.then(() => {
      clearTimeout(sigkillTimeout);
      clearTimeout(this._heartbeatTimeout);
    });
  }

  getWorkerId(): number {
    return this._options.workerId;
  }

  getStdout(): NodeJS.ReadableStream | null {
    return this._stdout;
  }

  getStderr(): NodeJS.ReadableStream | null {
    return this._stderr;
  }

  private _getFakeStream() {
    if (!this._fakeStream) {
      this._fakeStream = new PassThrough();
    }
    return this._fakeStream;
  }
}
