/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import BaseWorkerPool from './base/BaseWorkerPool';

import type {
  ChildMessage,
  OnCustomMessage,
  OnEnd,
  OnStart,
  WorkerInterface,
  WorkerOptions,
  WorkerPoolInterface,
} from './types';

const canUseWorkerThreads: () => boolean = () => {
  try {
    require('worker_threads');
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return false;
    }

    throw error;
  }
};

class WorkerPool extends BaseWorkerPool implements WorkerPoolInterface {
  send(
    workerId: number,
    request: ChildMessage,
    onStart: OnStart,
    onEnd: OnEnd,
    onCustomMessage: OnCustomMessage,
  ): void {
    this.getWorkerById(workerId).send(request, onStart, onEnd, onCustomMessage);
  }

  createWorker(workerOptions: WorkerOptions): WorkerInterface {
    let Worker;
    if (canUseWorkerThreads()) {
      Worker = require('./workers/NodeThreadsWorker').default;
    } else {
      Worker = require('./workers/ChildProcessWorker').default;
    }

    return new Worker(workerOptions);
  }
}

export default WorkerPool;
