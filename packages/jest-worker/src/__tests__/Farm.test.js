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
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      1, // second worker
      [1, true, 'foo1', [43]],
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      3,
      2, // third worker
      [1, true, 'foo2', [44]],
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      4,
      3, // fourth worker
      [1, true, 'foo3', [45]],
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
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      1, // second worker
      [1, true, 'foo1', [43]],
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      3,
      0, // first worker again
      [1, true, 'foo2', [44]],
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

    // Note that the stickiness is not created by the method name or the arguments
    // it is solely controlled by the provided "computeWorkerKey" method, which in
    // the test example always returns the same key, so all calls should be
    // redirected to worker 1 (which is the one that resolved the first call).
    const p1 = farm.doWork('foo', 'bar');
    workerReply(1, null, 17);
    await p1;

    // The first time, a call with a "1234567890abcdef" hash had never been done
    // earlier ("foo" call), so it got queued to all workers. Later, since the one
    // that resolved the call was the one in position 1, all subsequent calls are
    // only redirected to that worker.
    expect(callback).toHaveBeenCalledTimes(2); // Only "foo".
    expect(callback).toHaveBeenNthCalledWith(
      1,
      0, // first worker
      [1, true, 'car', ['plane']],
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      0, // first worker
      [1, true, 'foo', ['bar']],
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

    // Both requests are send to the same worker
    // The first time, a call with a "1234567890abcdef" hash had never been done
    // earlier ("foo" call), so it got queued to all workers. Later, since the one
    // that resolved the call was the one in position 1, all subsequent calls are
    // only redirected to that worker.
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(
      1,
      0, // first worker
      [1, true, 'car', ['plane']],
      expect.any(Function),
      expect.any(Function),
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      0, // first worker
      [1, true, 'foo', ['bar']],
      expect.any(Function),
      expect.any(Function),
    );
  });
});
