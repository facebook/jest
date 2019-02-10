/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

import childProcess from 'child_process';

import {
  CHILD_MESSAGE_INITIALIZE,
  PARENT_MESSAGE_CLIENT_ERROR,
  PARENT_MESSAGE_SETUP_ERROR,
  PARENT_MESSAGE_OK,
  WorkerInterface,
} from '../types';

import type {ChildProcess} from 'child_process';
import type {Readable} from 'stream';

import type {ChildMessage, OnEnd, OnStart, WorkerOptions} from '../types';

import supportsColor from 'supports-color';

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
  _child: ChildProcess;
  _options: WorkerOptions;
  _onProcessEnd: OnEnd;
  _retries: number;

  constructor(options: WorkerOptions) {
    this._options = options;
    this.initialize();
  }

  initialize() {
    const forceColor = supportsColor.stdout ? {FORCE_COLOR: '1'} : {};
    const child = childProcess.fork(require.resolve('./processChild'), {
      cwd: process.cwd(),
      env: {
        ...process.env,
        JEST_WORKER_ID: this._options.workerId,
        ...forceColor,
      },
      // Suppress --debug / --inspect flags while preserving others (like --harmony).
      execArgv: process.execArgv.filter(v => !/^--(debug|inspect)/.test(v)),
      silent: true,
      ...this._options.forkOptions,
    });

    child.on('message', this.onMessage.bind(this));
    child.on('exit', this.onExit.bind(this));

    child.send([
      CHILD_MESSAGE_INITIALIZE,
      false,
      this._options.workerPath,
      this._options.setupArgs,
    ]);

    this._child = child;
    this._retries++;

    // If we exceeded the amount of retries, we will emulate an error reply
    // coming from the child. This avoids code duplication related with cleaning
    // the queue, and scheduling the next call.
    if (this._retries > this._options.maxRetries) {
      const error = new Error('Call retries were exceeded');

      this.onMessage([
        PARENT_MESSAGE_CLIENT_ERROR,
        error.name,
        error.message,
        error.stack,
        {type: 'WorkerError'},
      ]);
    }
  }

  onMessage(response: any /* Should be ParentMessage */) {
    let error;

    switch (response[0]) {
      case PARENT_MESSAGE_OK:
        this._onProcessEnd(null, response[1]);
        break;

      case PARENT_MESSAGE_CLIENT_ERROR:
        error = response[4];

        if (error != null && typeof error === 'object') {
          const extra = error;
          const NativeCtor = global[response[1]];
          const Ctor = typeof NativeCtor === 'function' ? NativeCtor : Error;

          error = new Ctor(response[2]);
          // $FlowFixMe: adding custom properties to errors.
          error.type = response[1];
          error.stack = response[3];

          for (const key in extra) {
            // $FlowFixMe: adding custom properties to errors.
            error[key] = extra[key];
          }
        }

        this._onProcessEnd(error, null);
        break;

      case PARENT_MESSAGE_SETUP_ERROR:
        error = new Error('Error when calling setup: ' + response[2]);

        // $FlowFixMe: adding custom properties to errors.
        error.type = response[1];
        error.stack = response[3];

        this._onProcessEnd(error, null);
        break;

      default:
        throw new TypeError('Unexpected response from worker: ' + response[0]);
    }
  }

  onExit(exitCode: number) {
    if (exitCode !== 0) {
      this.initialize();
    }
  }

  send(request: ChildMessage, onProcessStart: OnStart, onProcessEnd: OnEnd) {
    onProcessStart(this);
    this._onProcessEnd = onProcessEnd;

    this._retries = 0;
    this._child.send(request);
  }

  getWorkerId(): number {
    return this._options.workerId;
  }

  getStdout(): Readable {
    return this._child.stdout;
  }

  getStderr(): Readable {
    return this._child.stderr;
  }
}
