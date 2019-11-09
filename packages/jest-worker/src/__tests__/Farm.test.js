/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import Farm from '../Farm';

let mockWorkerCalls;
let callback;

function workerReplyStart(i) {
  mockWorkerCalls[i].onStart({getWorkerId: () => mockWorkerCalls[i].workerId});
}

function workerReplyEnd(i, error, result) {
  mockWorkerCalls[i].onEnd(error, result);
}

function workerReply(i, error, result) {
  workerReplyStart(i);
  workerReplyEnd(i, error, result);
}

describe('Farm', () => {
  beforeEach(() => {
    mockWorkerCalls = [];
    callback = jest.fn((...args) => {
      mockWorkerCalls.push({
        onEnd: args[3],
        onStart: args[2],
        passed: args[1],
        workerId: args[0],
      });
    });
  });

  it('sends a request to one worker', () => {
    const farm = new Farm(4, callback);

    farm.doWork('foo', 42);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      0,
      [1, true, 'foo', [42]],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('sends four requests to four unique workers', () => {
    const farm = new Farm(4, callback);

    farm.doWork('foo', 42);
    farm.doWork('foo1', 43);
    farm.doWork('foo2', 44);
    farm.doWork('foo3', 45);

    expect(callback).toHaveBeenCalledTimes(4);
    expect(callback).toHaveBeenNthCalledWith(
      1,
      0, // first worker
      [1, true, 'foo', [42]],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      1, // second worker
      [1, true, 'foo1', [43]],
      expect.any(Function),
      expect.any(Function),

      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      3,
      2, // third worker
      [1, true, 'foo2', [44]],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      4,
      3, // fourth worker
      [1, true, 'foo3', [45]],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('handles null computeWorkerKey, sending to first worker', async () => {
    const computeWorkerKey = jest.fn(() => null);

    const farm = new Farm(4, callback, computeWorkerKey);

    const p0 = farm.doWork('foo', 42);
    workerReply(0);
    await p0;

    expect(computeWorkerKey).toBeCalledTimes(1);
    expect(computeWorkerKey).toHaveBeenNthCalledWith(1, 'foo', 42);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenNthCalledWith(
      1,
      0, // first worker
      [1, true, 'foo', [42]],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('sends the same worker key to the same worker', async () => {
    const computeWorkerKey = jest
      .fn(() => {})
      .mockReturnValueOnce('one')
      .mockReturnValueOnce('two')
      .mockReturnValueOnce('one');

    const farm = new Farm(4, callback, computeWorkerKey);

    const p0 = farm.doWork('foo', 42);
    workerReply(0);
    await p0;

    const p1 = farm.doWork('foo1', 43);
    workerReply(1);
    await p1;

    const p2 = farm.doWork('foo2', 44);
    workerReply(2);
    await p2;

    expect(computeWorkerKey).toBeCalledTimes(3);
    expect(computeWorkerKey).toHaveBeenNthCalledWith(1, 'foo', 42);
    expect(computeWorkerKey).toHaveBeenNthCalledWith(2, 'foo1', 43);
    expect(computeWorkerKey).toHaveBeenNthCalledWith(3, 'foo2', 44);

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(
      1,
      0, // first worker
      [1, true, 'foo', [42]],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      1, // second worker
      [1, true, 'foo1', [43]],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      3,
      0, // first worker again
      [1, true, 'foo2', [44]],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('returns the result if the call worked', async () => {
    const farm = new Farm(4, callback);

    const promise = farm.doWork('car', 'plane');

    workerReply(0, null, 34);
    const result = await promise;

    expect(result).toEqual(34);
  });

  it('throws if the call failed', async () => {
    const farm = new Farm(4, callback);

    const promise = farm.doWork('car', 'plane');
    let error = null;

    workerReply(0, new TypeError('Massively broken'));

    try {
      await promise;
    } catch (err) {
      error = err;
    }

    expect(error).not.toBe(null);
    expect(error).toBeInstanceOf(TypeError);
  });

  it('checks that once a sticked task finishes, next time is sent to that worker', async () => {
    const farm = new Farm(4, callback, () => '1234567890abcdef');

    // Worker 1 successfully replies with "17" as a result.
    const p0 = farm.doWork('car', 'plane');
    workerReply(0, null, 17);
    await p0;

    // Note that the stickiness is not created by the method name or the
    // arguments it is solely controlled by the provided "computeWorkerKey"
    // method, which in the test example always returns the same key, so all
    // calls should be redirected to worker 1 (which is the one that resolved
    // the first call).
    const p1 = farm.doWork('foo', 'bar');
    workerReply(1, null, 17);
    await p1;

    // The first time, a call with a "1234567890abcdef" hash had never been
    // done earlier ("foo" call), so it got queued to all workers. Later, since
    // the one that resolved the call was the one in position 1, all subsequent
    // calls are only redirected to that worker.
    expect(callback).toHaveBeenCalledTimes(2); // Only "foo".
    expect(callback).toHaveBeenNthCalledWith(
      1,
      0, // first worker
      [1, true, 'car', ['plane']],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      0, // first worker
      [1, true, 'foo', ['bar']],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('checks that even before a sticked task finishes, next time is sent to that worker', async () => {
    const farm = new Farm(4, callback, () => '1234567890abcdef');

    // Note that the worker is sending a start response synchronously.
    const p0 = farm.doWork('car', 'plane');
    workerReplyStart(0);

    // Note that the worker is sending a start response synchronously.
    const p1 = farm.doWork('foo', 'bar');

    // The first call is sent the worker, the second is queued
    expect(callback).toHaveBeenCalledTimes(1);

    // Flush the queue
    workerReplyEnd(0, null, 17);
    await p0;
    workerReply(1, null, 17);
    await p1;

    // Both requests are send to the same worker.  The first time, a call with
    // a "1234567890abcdef" hash had never been done earlier ("foo" call), so
    // it got queued to all workers. Later, since the one that resolved the
    // call was the one in position 1, all subsequent calls are only redirected
    // to that worker.
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(
      1,
      0, // first worker
      [1, true, 'car', ['plane']],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      0, // first worker
      [1, true, 'foo', ['bar']],
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('checks that locking works, and jobs are never lost', async () => {
    const hash = jest
      .fn()
      // This will go to both queues, but picked by the first worker.
      .mockReturnValueOnce(0)
      // This will go to both queues too, but picked by the second worker.
      .mockReturnValueOnce(1)
      // This will go to worker 0, now only assigned to it.
      .mockReturnValueOnce(0)
      // This will go to worker 1, now only assigned to it.
      .mockReturnValueOnce(1)
      // This will go to both queues too, but will wait, since workers are busy.
      .mockReturnValueOnce(2)
      // This will only go to the first queue.
      .mockReturnValueOnce(0)
      // This will be gone if the queue implementation is wrong.
      .mockReturnValueOnce(0)
      // Push onto the second queue; potentially wiping the earlier job.
      .mockReturnValueOnce(1);

    const farm = new Farm(2, callback, hash);

    // First and second jobs get resolved, so that their hash is sticked to
    // the right worker: worker assignment is performed when workers reply, not
    // when the call is made.
    const p0 = farm.doWork('work-0');
    const p1 = farm.doWork('work-1');
    workerReply(0, null, 'response-0');
    await p0;
    workerReply(1, null, 'response-1');
    await p1;

    // Now we perform the rest of the calls (7 resolves before 5 and 6, since 4
    // is in both queues, and as soon as you resolve 4, 7 will be picked).
    const p2 = farm.doWork('work-2');
    const p3 = farm.doWork('work-3');
    const p4 = farm.doWork('work-4');
    const p5 = farm.doWork('work-5');
    const p6 = farm.doWork('work-6');
    const p7 = farm.doWork('work-7');
    workerReply(2, null, 'response-2');
    await p2;
    workerReply(3, null, 'response-3');
    await p3;
    workerReply(4, null, 'response-4');
    await p4;
    workerReply(5, null, 'response-7');
    await p7;
    workerReply(6, null, 'response-5');
    await p5;
    workerReply(7, null, 'response-6');
    await p6;

    await expect(p0).resolves.toBe('response-0');
    await expect(p1).resolves.toBe('response-1');
    await expect(p2).resolves.toBe('response-2');
    await expect(p3).resolves.toBe('response-3');
    await expect(p4).resolves.toBe('response-4');
    await expect(p5).resolves.toBe('response-5');
    await expect(p6).resolves.toBe('response-6');
    await expect(p7).resolves.toBe('response-7');
  });
});
