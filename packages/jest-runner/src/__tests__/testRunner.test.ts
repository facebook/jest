/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {TestWatcher} from '@jest/core';
import TestRunner from '../index';

let mockWorkerFarm;

jest.mock('jest-worker', () =>
  jest.fn(
    worker =>
      (mockWorkerFarm = {
        end: jest.fn().mockResolvedValue({forceExited: false}),
        getStderr: jest.fn(),
        getStdout: jest.fn(),
        worker: jest.fn((data, callback) => require(worker)(data, callback)),
      }),
  ),
);

jest.mock('../testWorker', () => {});

test('injects the serializable module map into each worker in watch mode', async () => {
  const globalConfig = {maxWorkers: 2, watch: true};
  const config = {rootDir: '/path/'};
  const serializableModuleMap = jest.fn();
  const runContext = {};
  const context = {
    config,
    moduleMap: {toJSON: () => serializableModuleMap},
  };

  await new TestRunner(globalConfig).runTests(
    [
      {context, path: './file.test.js'},
      {context, path: './file2.test.js'},
    ],
    new TestWatcher({isWatchMode: globalConfig.watch}),
    {serial: false},
  );

  expect(mockWorkerFarm.worker.mock.calls).toEqual([
    [
      {
        config,
        context: runContext,
        globalConfig,
        path: './file.test.js',
      },
    ],
    [
      {
        config,
        context: runContext,
        globalConfig,
        path: './file2.test.js',
      },
    ],
  ]);
});

test('assign process.env.JEST_WORKER_ID = 1 when in runInBand mode', async () => {
  const globalConfig = {maxWorkers: 1, watch: false};
  const config = {rootDir: '/path/'};
  const context = {config};

  await new TestRunner(globalConfig).runTests(
    [{context, path: './file.test.js'}],
    new TestWatcher({isWatchMode: globalConfig.watch}),
    {serial: true},
  );

  expect(process.env.JEST_WORKER_ID).toBe('1');
});
