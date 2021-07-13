/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import {PassThrough} from 'stream';
import {Worker} from 'worker_threads';
import mergeStream = require('merge-stream');
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

const CHILD_HEARTBEAT_INTERVAL = 1_000;

export default class ExperimentalWorker implements WorkerInterface {
  private _worker!: Worker;
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
  private _forceExited: boolean;

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
    this._forceExited = false;

    this.initialize();
  }

  initialize(): void {
    this._worker = new Worker(path.resolve(__dirname, './threadChild.js'), {
      eval: false,
      // @ts-expect-error: added in newer versions
      resourceLimits: this._options.resourceLimits,
      stderr: true,
      stdout: true,
      workerData: {
        cwd: process.cwd(),
        env: {
          ...process.env,
          JEST_WORKER_ID: String(this._options.workerId + 1), // 0-indexed workerId, 1-indexed JEST_WORKER_ID
        } as NodeJS.ProcessEnv,
        // Suppress --debug / --inspect flags while preserving others (like --harmony).
        execArgv: process.execArgv.filter(v => !/^--(debug|inspect)/.test(v)),
        silent: true,
        ...this._options.forkOptions,
      },
    });

    if (this._worker.stdout) {
      if (!this._stdout) {
        // We need to add a permanent stream to the merged stream to prevent it
        // from ending when the subprocess stream ends
        this._stdout = mergeStream(this._getFakeStream());
      }

      this._stdout.add(this._worker.stdout);
    }

    if (this._worker.stderr) {
      if (!this._stderr) {
        // We need to add a permanent stream to the merged stream to prevent it
        // from ending when the subprocess stream ends
        this._stderr = mergeStream(this._getFakeStream());
      }

      this._stderr.add(this._worker.stderr);
    }

    this._worker.on('message', this._onMessage.bind(this));
    this._worker.on('exit', this._onExit.bind(this));

    this._worker.postMessage([
      CHILD_MESSAGE_INITIALIZE,
      false,
      this._options.workerPath,
      this._options.setupArgs,
      CHILD_HEARTBEAT_INTERVAL,
    ]);

    this._retries++;

    // If we exceeded the amount of retries, we will emulate an error reply
    // coming from the child. This avoids code duplication related with cleaning
    // the queue, and scheduling the next call.
    if (this._retries > this._options.maxRetries) {
      const error = new Error('Call retries were exceeded');

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
    // End the permanent stream so the merged stream end too
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
    let error;

    switch (response[0]) {
      case PARENT_MESSAGE_OK:
        this._onProcessEnd(null, response[1]);
        break;

      case PARENT_MESSAGE_CLIENT_ERROR:
        if (this._heartbeatTimeout) {
          clearTimeout(this._heartbeatTimeout);
          this.forceExit();
        }
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
            // @ts-expect-error: no index
            error[key] = extra[key];
          }
        }

        this._onProcessEnd(error, null);
        break;
      case PARENT_MESSAGE_SETUP_ERROR:
        error = new Error('Error when calling setup: ' + response[2]);

        // @ts-expect-error: adding custom properties to errors.
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

  private _onExit(exitCode: number) {
    if (exitCode !== 0 && !this._forceExited) {
      this.initialize();

      if (this._request) {
        this._worker.postMessage(this._request);
      }
    } else {
      this._shutdown();
      clearTimeout(this._heartbeatTimeout);
    }
  }

  waitForExit(): Promise<void> {
    return this._exitPromise;
  }

  forceExit(): void {
    this._forceExited = true;
    this._worker.terminate();
    clearTimeout(this._heartbeatTimeout);
  }

  send(
    request: ChildMessage,
    onProcessStart: OnStart,
    onProcessEnd: OnEnd | null,
    onCustomMessage: OnCustomMessage,
  ): void {
    onProcessStart(this);
    this._onProcessEnd = (...args) => {
      // Clean the request to avoid sending past requests to workers that fail
      // while waiting for a new request (timers, unhandled rejections...)
      this._request = null;

      const res = onProcessEnd?.(...args);

      // Clean up the reference so related closures can be garbage collected.
      onProcessEnd = null;

      return res;
    };

    this._onCustomMessage = (...arg) => onCustomMessage(...arg);

    this._request = request;
    this._retries = 0;

    this._worker.postMessage(request);
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
