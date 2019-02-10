/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import queueRunner from '../queueRunner';

describe('queueRunner', () => {
  it('runs every function in the queue.', async () => {
    const fnOne = jest.fn(next => next());
    const fnTwo = jest.fn(next => next());
    const options = {
      clearTimeout,
      fail: () => {},
      onException: () => {},
      queueableFns: [
        {
          fn: fnOne,
        },
        {
          fn: fnTwo,
        },
      ],
      setTimeout,
    };
    await queueRunner(options);
    expect(fnOne).toHaveBeenCalled();
    expect(fnTwo).toHaveBeenCalled();
  });

  it('exposes `fail` to `next`.', async () => {
    const fail = jest.fn();
    const fnOne = jest.fn(next => next.fail());
    const fnTwo = jest.fn(next => next());
    const options = {
      clearTimeout,
      fail,
      onException: () => {},
      queueableFns: [
        {
          fn: fnOne,
        },
        {
          fn: fnTwo,
        },
      ],
      setTimeout,
    };
    await queueRunner(options);
    expect(fnOne).toHaveBeenCalled();
    expect(fail).toHaveBeenCalled();
    // Even if `fail` is called, the queue keeps running.
    expect(fnTwo).toHaveBeenCalled();
  });

  it('passes errors to `onException`.', async () => {
    const error = new Error('The error a test throws.');
    const fnOne = jest.fn(() => {
      throw error;
    });
    const fnTwo = jest.fn(next => next());
    const onException = jest.fn();
    const options = {
      clearTimeout,
      fail: () => {},
      onException,
      queueableFns: [
        {
          fn: fnOne,
        },
        {
          fn: fnTwo,
        },
      ],
      setTimeout,
    };
    await queueRunner(options);
    expect(fnOne).toHaveBeenCalled();
    expect(onException).toHaveBeenCalledWith(error);
    // Even if one of them errors, the queue keeps running.
    expect(fnTwo).toHaveBeenCalled();
  });

  it('passes an error to `onException` on timeout.', async () => {
    const fnOne = jest.fn(next => {});
    const fnTwo = jest.fn(next => next());
    const onException = jest.fn();
    const options = {
      clearTimeout,
      fail: () => {},
      onException,
      queueableFns: [
        {
          fn: fnOne,
          // It times out in zero seconds.
          timeout: () => 0,
        },
        {
          fn: fnTwo,
        },
      ],
      setTimeout,
    };
    await queueRunner(options);
    expect(fnOne).toHaveBeenCalled();
    expect(onException).toHaveBeenCalled();
    // i.e. the `message` of the error passed to `onException`.
    expect(onException.mock.calls[0][0].message).toEqual(
      'Timeout - Async callback was not invoked within the 0ms timeout ' +
        'specified by jest.setTimeout.',
    );
    expect(fnTwo).toHaveBeenCalled();
  });

  it('calls `fail` with arguments', async () => {
    const failFn = jest.fn(next => next.fail('miserably', 'failed'));
    const options = {
      clearTimeout,
      fail: jest.fn(),
      queueableFns: [{fn: failFn}],
      setTimeout,
    };
    await queueRunner(options);

    expect(options.fail).toHaveBeenCalledWith('miserably', 'failed');
  });

  it('calls `fail` when done(error) is invoked', async () => {
    const error = new Error('I am an error');
    const fail = jest.fn();
    const fnOne = jest.fn(next => next(error));
    const fnTwo = jest.fn(next => next());
    const options = {
      clearTimeout,
      fail,
      onException: () => {},
      queueableFns: [
        {
          fn: fnOne,
        },
        {
          fn: fnTwo,
        },
      ],
      setTimeout,
    };
    await queueRunner(options);
    expect(fnOne).toHaveBeenCalled();
    expect(fail).toHaveBeenCalledWith(error);
    // Even if `fail` is called, the queue keeps running.
    expect(fnTwo).toHaveBeenCalled();
  });
});
