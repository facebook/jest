/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

import BaseWorkerPool from './base/BaseWorkerPool';

import type {
  ChildMessage,
  WorkerOptions,
  OnStart,
  OnEnd,
  WorkerPoolInterface,
  WorkerInterface,
} from './types';

const canUseWorkerThreads = () => {
  try {
    // $FlowFixMe: Flow doesn't know about experimental APIs
    require('worker_threads');
    return true;
  } catch (_) {
    return false;
  }
};

class WorkerPool extends BaseWorkerPool implements WorkerPoolInterface {
  send(
    workerId: number,
    request: ChildMessage,
    onStart: OnStart,
    onEnd: OnEnd,
  ): void {
    this.getWorkerById(workerId).send(request, onStart, onEnd);
  }

  createWorker(workerOptions: WorkerOptions): WorkerInterface {
    let Worker;
    if (this._options.enableWorkerThreads && canUseWorkerThreads()) {
      Worker = require('./workers/NodeThreadsWorker').default;
    } else {
      Worker = require('./workers/ChildProcessWorker').default;
    }

    return new Worker(workerOptions);
  }
}

export default WorkerPool;
