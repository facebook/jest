/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import EventEmitter from 'events';

import {CHILD_MESSAGE_CALL, PARENT_MESSAGE_OK} from '../types';

let Farm;
let mockForkedProcesses;

function mockBuildForkedProcess() {
  const mockChild = new EventEmitter();

  mockChild.send = jest.fn();

  return mockChild;
}

function replySuccess(i, result) {
  mockForkedProcesses[i].emit('message', [PARENT_MESSAGE_OK, result]);
}

function assertCallsToChild(childNum, ...calls) {
  expect(mockForkedProcesses[childNum].send).toHaveBeenCalledTimes(
    calls.length + 1,
  );

  calls.forEach(([methodName, ...args], numCall) => {
    expect(
      mockForkedProcesses[childNum].send.mock.calls[numCall + 1][0],
    ).toEqual([CHILD_MESSAGE_CALL, true, methodName, args]);
  });
}

jest.mock('worker_threads', () => {
  throw Error('Unsupported');
});

describe('Jest Worker Integration', () => {
  beforeEach(() => {
    mockForkedProcesses = [];

    jest.mock('child_process', () => ({
      fork() {
        const forkedProcess = mockBuildForkedProcess();

        mockForkedProcesses.push(forkedProcess);

        return forkedProcess;
      },
    }));

    Farm = require('../index').default;
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('calls a single method from the worker', async () => {
    const farm = new Farm('/tmp/baz.js', {
      exposedMethods: ['foo', 'bar'],
      numWorkers: 4,
    });

    const promise = farm.foo();

    replySuccess(0, 42);

    expect(await promise).toBe(42);
  });

  it('distributes sequential calls across child processes', async () => {
    const farm = new Farm('/tmp/baz.js', {
      exposedMethods: ['foo', 'bar'],
      numWorkers: 4,
    });

    // The first call will go to the first child process.
    const promise0 = farm.foo('param-0');

    assertCallsToChild(0, ['foo', 'param-0']);
    replySuccess(0, 'worker-0');
    expect(await promise0).toBe('worker-0');

    // The second call will go to the second child process.
    const promise1 = farm.foo(1);

    assertCallsToChild(1, ['foo', 1]);
    replySuccess(1, 'worker-1');
    expect(await promise1).toBe('worker-1');
  });

  it('distributes concurrent calls across child processes', async () => {
    const farm = new Farm('/tmp/baz.js', {
      exposedMethods: ['foo', 'bar'],
      numWorkers: 4,
    });

    // Do 3 calls to the farm in parallel.
    const promise0 = farm.foo('param-0');
    const promise1 = farm.foo('param-1');
    const promise2 = farm.foo('param-2');

    // Check that the method calls are sent to each separate child process.
    assertCallsToChild(0, ['foo', 'param-0']);
    assertCallsToChild(1, ['foo', 'param-1']);
    assertCallsToChild(2, ['foo', 'param-2']);

    // Send different responses from each child.
    replySuccess(0, 'worker-0');
    replySuccess(1, 'worker-1');
    replySuccess(2, 'worker-2');

    // Check
    expect(await promise0).toBe('worker-0');
    expect(await promise1).toBe('worker-1');
    expect(await promise2).toBe('worker-2');
  });

  it('sticks parallel calls to children', async () => {
    const farm = new Farm('/tmp/baz.js', {
      computeWorkerKey: () => '1234567890abcdef',
      exposedMethods: ['foo', 'bar'],
      numWorkers: 4,
    });

    // Do 3 calls to the farm in parallel.
    const promise0 = farm.foo('param-0');
    const promise1 = farm.foo('param-1');
    const promise2 = farm.foo('param-2');

    // Send different responses for each call (from the same child).
    replySuccess(0, 'worker-0');
    replySuccess(0, 'worker-1');
    replySuccess(0, 'worker-2');

    // Check that all the calls have been received by the same child).
    assertCallsToChild(
      0,
      ['foo', 'param-0'],
      ['foo', 'param-1'],
      ['foo', 'param-2'],
    );

    // Check that responses are correct.
    expect(await promise0).toBe('worker-0');
    expect(await promise1).toBe('worker-1');
    expect(await promise2).toBe('worker-2');
  });
});
