/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import mergeStream = require('merge-stream');

import {
  CHILD_MESSAGE_END,
  PoolExitResult,
  WorkerInterface,
  WorkerOptions,
  WorkerPoolOptions,
} from '../types';

// How long to wait for the child process to terminate
// after CHILD_MESSAGE_END before sending force exiting.
const FORCE_EXIT_DELAY = 500;

/* istanbul ignore next */
const emptyMethod = () => {};

export default class BaseWorkerPool {
  private readonly _stderr: NodeJS.ReadableStream;
  private readonly _stdout: NodeJS.ReadableStream;
  protected readonly _options: WorkerPoolOptions;
  private readonly _workers: Array<WorkerInterface>;

  constructor(workerPath: string, options: WorkerPoolOptions) {
    this._options = options;
    this._workers = new Array(options.numWorkers);

    if (!path.isAbsolute(workerPath)) {
      workerPath = require.resolve(workerPath);
    }

    const stdout = mergeStream();
    const stderr = mergeStream();

    const {forkOptions, maxRetries, setupArgs} = options;

    for (let i = 0; i < options.numWorkers; i++) {
      const workerOptions: WorkerOptions = {
        forkOptions,
        maxRetries,
        setupArgs,
        workerId: i,
        workerPath,
      };

      const worker = this.createWorker(workerOptions);
      const workerStdout = worker.getStdout();
      const workerStderr = worker.getStderr();

      if (workerStdout) {
        stdout.add(workerStdout);
      }

      if (workerStderr) {
        stderr.add(workerStderr);
      }

      this._workers[i] = worker;
    }

    this._stdout = stdout;
    this._stderr = stderr;
  }

  getStderr(): NodeJS.ReadableStream {
    return this._stderr;
  }

  getStdout(): NodeJS.ReadableStream {
    return this._stdout;
  }

  getWorkers(): Array<WorkerInterface> {
    return this._workers;
  }

  getWorkerById(workerId: number): WorkerInterface {
    return this._workers[workerId];
  }

  createWorker(_workerOptions: WorkerOptions): WorkerInterface {
    throw Error('Missing method createWorker in WorkerPool');
  }

  async end(): Promise<PoolExitResult> {
    // We do not cache the request object here. If so, it would only be only
    // processed by one of the workers, and we want them all to close.
    const workerExitPromises = this._workers.map(async worker => {
      worker.send(
        [CHILD_MESSAGE_END, false],
        emptyMethod,
        emptyMethod,
        emptyMethod,
      );

      // Schedule a force exit in case worker fails to exit gracefully so
      // await worker.waitForExit() never takes longer than FORCE_EXIT_DELAY
      let forceExited = false;
      const forceExitTimeout = setTimeout(() => {
        worker.forceExit();
        forceExited = true;
      }, FORCE_EXIT_DELAY);

      await worker.waitForExit();
      // Worker ideally exited gracefully, don't send force exit then
      clearTimeout(forceExitTimeout);

      return forceExited;
    });

    const workerExits = await Promise.all(workerExitPromises);
    return workerExits.reduce<PoolExitResult>(
      (result, forceExited) => ({
        forceExited: result.forceExited || forceExited,
      }),
      {forceExited: false},
    );
  }
}
