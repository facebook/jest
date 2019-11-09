/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  CHILD_MESSAGE_CALL,
  ChildMessage,
  FarmOptions,
  OnCustomMessage,
  OnEnd,
  OnStart,
  PromiseWithCustomMessage,
  QueueChildMessage,
  QueueItem,
  WorkerInterface,
} from './types';

export default class Farm {
  private _computeWorkerKey: FarmOptions['computeWorkerKey'];
  private _cacheKeys: Record<string, WorkerInterface>;
  private _callback: Function;
  private _last: Array<QueueItem>;
  private _locks: Array<boolean>;
  private _numOfWorkers: number;
  private _offset: number;
  private _queue: Array<QueueItem | null>;

  constructor(
    numOfWorkers: number,
    callback: Function,
    computeWorkerKey?: FarmOptions['computeWorkerKey'],
  ) {
    this._cacheKeys = Object.create(null);
    this._callback = callback;
    this._last = [];
    this._locks = [];
    this._numOfWorkers = numOfWorkers;
    this._offset = 0;
    this._queue = [];

    if (computeWorkerKey) {
      this._computeWorkerKey = computeWorkerKey;
    }
  }

  doWork(
    method: string,
    ...args: Array<any>
  ): PromiseWithCustomMessage<unknown> {
    let customMessageListeners: Array<OnCustomMessage> = [];

    const addCustomMessageListener = (listener: OnCustomMessage) => {
      customMessageListeners.push(listener);
      return () => {
        customMessageListeners = customMessageListeners.filter(
          l => l !== listener,
        );
      };
    };

    const onCustomMessage: OnCustomMessage = (message: any) => {
      customMessageListeners.forEach(listener => listener(message));
    };

    const promise: PromiseWithCustomMessage<unknown> = new Promise(
      (resolve, reject) => {
        const computeWorkerKey = this._computeWorkerKey;
        const request: ChildMessage = [CHILD_MESSAGE_CALL, false, method, args];

        let worker: WorkerInterface | null = null;
        let hash: string | null = null;

        if (computeWorkerKey) {
          hash = computeWorkerKey.call(this, method, ...args);
          worker = hash == null ? null : this._cacheKeys[hash];
        }

        const onStart: OnStart = (worker: WorkerInterface) => {
          if (hash != null) {
            this._cacheKeys[hash] = worker;
          }
        };

        const onEnd: OnEnd = (error: Error | null, result: unknown) => {
          customMessageListeners = [];
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        };

        const task = {onCustomMessage, onEnd, onStart, request};

        if (worker) {
          this._enqueue(task, worker.getWorkerId());
        } else {
          this._push(task);
        }
      },
    );

    promise.onCustomMessage = addCustomMessageListener;

    return promise;
  }

  private _getNextTask(workerId: number): QueueChildMessage | null {
    let queueHead = this._queue[workerId];

    while (queueHead && queueHead.task.request[1]) {
      queueHead = queueHead.next || null;
    }

    this._queue[workerId] = queueHead;

    return queueHead && queueHead.task;
  }

  private _process(workerId: number): Farm {
    if (this._isLocked(workerId)) {
      return this;
    }

    const task = this._getNextTask(workerId);

    if (!task) {
      return this;
    }

    const onEnd = (error: Error | null, result: unknown) => {
      task.onEnd(error, result);

      this._unlock(workerId);
      this._process(workerId);
    };

    task.request[1] = true;

    this._lock(workerId);
    this._callback(
      workerId,
      task.request,
      task.onStart,
      onEnd,
      task.onCustomMessage,
    );

    return this;
  }

  private _enqueue(task: QueueChildMessage, workerId: number): Farm {
    const item = {next: null, task};

    if (task.request[1]) {
      return this;
    }

    if (this._queue[workerId]) {
      this._last[workerId].next = item;
    } else {
      this._queue[workerId] = item;
    }

    this._last[workerId] = item;
    this._process(workerId);

    return this;
  }

  private _push(task: QueueChildMessage): Farm {
    for (let i = 0; i < this._numOfWorkers; i++) {
      this._enqueue(task, (this._offset + i) % this._numOfWorkers);
    }

    this._offset++;

    return this;
  }

  private _lock(workerId: number): void {
    this._locks[workerId] = true;
  }

  private _unlock(workerId: number): void {
    this._locks[workerId] = false;
  }

  private _isLocked(workerId: number): boolean {
    return this._locks[workerId];
  }
}
