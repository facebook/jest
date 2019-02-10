/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {CHILD_MESSAGE_END} from '../../types';

import BaseWorkerPool from '../BaseWorkerPool';

const Worker = jest.fn(() => ({
  getStderr: () => ({once() {}, pipe() {}}),
  getStdout: () => ({once() {}, pipe() {}}),
  send: jest.fn(),
}));

const mockSend = jest.fn();

class MockWorkerPool extends BaseWorkerPool {
  createWorker(...args) {
    return new Worker(...args);
  }
  send(...args) {
    return mockSend(...args);
  }
}

describe('BaseWorkerPool', () => {
  beforeEach(() => {
    Worker.mockClear();
  });

  it('throws error when createWorker is not defined', () => {
    expect(
      () =>
        new BaseWorkerPool('/tmp/baz.js', {
          forkOptions: {execArgv: []},
          maxRetries: 6,
          numWorkers: 4,
          setupArgs: [],
        }),
    ).toThrow('Missing method createWorker in WorkerPool');
  });

  it('creates and exposes n workers', () => {
    const pool = new MockWorkerPool('/tmp/baz.js', {
      forkOptions: {execArgv: []},
      maxRetries: 6,
      numWorkers: 4,
      setupArgs: [],
    });

    expect(pool.getWorkers()).toHaveLength(4);
    expect(pool.getWorkerById(0)).toBeDefined();
    expect(pool.getWorkerById(1)).toBeDefined();
    expect(pool.getWorkerById(2)).toBeDefined();
    expect(pool.getWorkerById(3)).toBeDefined();
  });

  it('ends all workers', () => {
    const pool = new MockWorkerPool('/tmp/baz.js', {
      forkOptions: {execArgv: []},
      maxRetries: 6,
      numWorkers: 4,
      setupArgs: [],
    });

    const workers = pool.getWorkers();
    pool.end();

    const endMessage = [CHILD_MESSAGE_END, false];
    expect(workers[0].send.mock.calls[0][0]).toEqual(endMessage);
    expect(workers[1].send.mock.calls[0][0]).toEqual(endMessage);
    expect(workers[2].send.mock.calls[0][0]).toEqual(endMessage);
    expect(workers[3].send.mock.calls[0][0]).toEqual(endMessage);
  });

  it('creates and expoeses n workers', () => {
    const pool = new MockWorkerPool('/tmp/baz.js', {
      forkOptions: {execArgv: []},
      maxRetries: 6,
      numWorkers: 4,
      setupArgs: [],
    });

    expect(pool.getWorkers()).toHaveLength(4);
    expect(pool.getWorkerById(0)).toBeDefined();
    expect(pool.getWorkerById(1)).toBeDefined();
    expect(pool.getWorkerById(2)).toBeDefined();
    expect(pool.getWorkerById(3)).toBeDefined();
  });

  it('creates workers with the right options', () => {
    // eslint-disable-next-line no-new
    new MockWorkerPool('/tmp/baz.js', {
      forkOptions: {execArgv: []},
      maxRetries: 6,
      numWorkers: 4,
      setupArgs: [{foo: 'bar'}],
    });

    expect(Worker).toHaveBeenCalledTimes(4);
    expect(Worker).toHaveBeenNthCalledWith(1, {
      forkOptions: {execArgv: []},
      maxRetries: 6,
      setupArgs: [{foo: 'bar'}],
      workerId: 0,
      workerPath: '/tmp/baz.js',
    });
    expect(Worker).toHaveBeenNthCalledWith(2, {
      forkOptions: {execArgv: []},
      maxRetries: 6,
      setupArgs: [{foo: 'bar'}],
      workerId: 1,
      workerPath: '/tmp/baz.js',
    });
    expect(Worker).toHaveBeenNthCalledWith(3, {
      forkOptions: {execArgv: []},
      maxRetries: 6,
      setupArgs: [{foo: 'bar'}],
      workerId: 2,
      workerPath: '/tmp/baz.js',
    });
    expect(Worker).toHaveBeenNthCalledWith(4, {
      forkOptions: {execArgv: []},
      maxRetries: 6,
      setupArgs: [{foo: 'bar'}],
      workerId: 3,
      workerPath: '/tmp/baz.js',
    });
  });

  it('makes a non-existing relative worker throw', () => {
    expect(() => {
      // eslint-disable-next-line no-new
      new MockWorkerPool('./baz.js', {
        exposedMethods: [],
        numWorkers: 1,
      });
    }).toThrow();
  });

  it('create multiple workers with unique worker ids', () => {
    // eslint-disable-next-line no-new
    new MockWorkerPool('/tmp/baz.js', {
      exposedMethods: ['foo', 'bar'],
      forkOptions: {execArgv: []},
      maxRetries: 6,
      numWorkers: 3,
    });

    expect(Worker).toHaveBeenCalledTimes(3);
    expect(Worker.mock.calls[0][0].workerId).toEqual(0);
    expect(Worker.mock.calls[1][0].workerId).toEqual(1);
    expect(Worker.mock.calls[2][0].workerId).toEqual(2);
  });

  it('aggregates all stdouts and stderrs from all workers', () => {
    const out = [];
    const err = [];

    Worker.mockImplementation(() => ({
      getStderr: () => ({
        once() {},
        pipe(errStream) {
          err.push(errStream);
        },
      }),
      getStdout: () => ({
        once() {},
        pipe(outStream) {
          out.push(outStream);
        },
      }),
    }));

    const farm = new MockWorkerPool('/tmp/baz.js', {
      exposedMethods: ['foo', 'bar'],
      numWorkers: 2,
    });

    expect(out.length).toBe(2);
    expect(err.length).toBe(2);

    const stdout = jest.fn();
    const stderr = jest.fn();

    farm.getStdout().on('data', stdout);
    farm.getStderr().on('data', stderr);

    out[0].write(Buffer.from('hello'));
    out[1].write(Buffer.from('bye'));
    err[1].write(Buffer.from('house'));
    err[0].write(Buffer.from('tree'));

    expect(stdout.mock.calls[0][0].toString()).toBe('hello');
    expect(stdout.mock.calls[1][0].toString()).toBe('bye');
    expect(stderr.mock.calls[0][0].toString()).toBe('house');
    expect(stderr.mock.calls[1][0].toString()).toBe('tree');
  });

  it('works when stdout and stderr are not piped to the parent', () => {
    Worker.mockImplementation(() => ({
      getStderr: () => null,
      getStdout: () => null,
      send: () => null,
    }));

    const farm = new MockWorkerPool('/tmp/baz.js', {
      exposedMethods: ['foo', 'bar'],
      forkOptions: {
        silent: false,
        stdio: 'inherit',
      },
      numWorkers: 2,
    });

    expect(() => farm.send()).not.toThrow();
    expect(() => farm.send()).not.toThrow();
  });
});
