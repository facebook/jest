/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config} from '@jest/types';
import {SerializableError} from '@jest/test-result';
import exit = require('exit');
import chalk = require('chalk');
import throat from 'throat';
import Worker from 'jest-worker';
import runTest from './runTest';
import {SerializableResolver, worker} from './testWorker';
import {
  OnTestFailure as JestOnTestFailure,
  OnTestStart as JestOnTestStart,
  OnTestSuccess as JestOnTestSuccess,
  Test as JestTest,
  TestRunnerContext as JestTestRunnerContext,
  TestRunnerOptions as JestTestRunnerOptions,
  TestWatcher as JestTestWatcher,
  WatcherState,
} from './types';

const TEST_WORKER_PATH = require.resolve('./testWorker');

interface WorkerInterface extends Worker {
  worker: typeof worker;
}

namespace TestRunner {
  export type Test = JestTest;
  export type OnTestFailure = JestOnTestFailure;
  export type OnTestStart = JestOnTestStart;
  export type OnTestSuccess = JestOnTestSuccess;
  export type TestWatcher = JestTestWatcher;
  export type TestRunnerContext = JestTestRunnerContext;
  export type TestRunnerOptions = JestTestRunnerOptions;
}

/* eslint-disable-next-line no-redeclare */
class TestRunner {
  private _globalConfig: Config.GlobalConfig;
  private _context: JestTestRunnerContext;

  constructor(
    globalConfig: Config.GlobalConfig,
    context?: JestTestRunnerContext,
  ) {
    this._globalConfig = globalConfig;
    this._context = context || {};
  }

  async runTests(
    tests: Array<JestTest>,
    watcher: JestTestWatcher,
    onStart: JestOnTestStart,
    onResult: JestOnTestSuccess,
    onFailure: JestOnTestFailure,
    options: JestTestRunnerOptions,
  ): Promise<void> {
    return await (options.serial
      ? this._createInBandTestRun(tests, watcher, onStart, onResult, onFailure)
      : this._createParallelTestRun(
          tests,
          watcher,
          onStart,
          onResult,
          onFailure,
        ));
  }

  private async _createInBandTestRun(
    tests: Array<JestTest>,
    watcher: JestTestWatcher,
    onStart: JestOnTestStart,
    onResult: JestOnTestSuccess,
    onFailure: JestOnTestFailure,
  ) {
    process.env.JEST_WORKER_ID = '1';
    const mutex = throat(1);
    return tests.reduce(
      (promise, test) =>
        mutex(() =>
          promise
            .then(async () => {
              if (watcher.isInterrupted()) {
                throw new CancelRun();
              }

              await onStart(test);
              return runTest(
                test.path,
                this._globalConfig,
                test.context.config,
                test.context.resolver,
                this._context,
              );
            })
            .then(result => onResult(test, result))
            .catch(err => onFailure(test, err)),
        ),
      Promise.resolve(),
    );
  }

  private async _createParallelTestRun(
    tests: Array<JestTest>,
    watcher: JestTestWatcher,
    onStart: JestOnTestStart,
    onResult: JestOnTestSuccess,
    onFailure: JestOnTestFailure,
  ) {
    const resolvers: Map<string, SerializableResolver> = new Map();
    for (const test of tests) {
      if (!resolvers.has(test.context.config.name)) {
        resolvers.set(test.context.config.name, {
          config: test.context.config,
          serializableModuleMap: test.context.moduleMap.toJSON(),
        });
      }
    }

    const worker = new Worker(TEST_WORKER_PATH, {
      exposedMethods: ['worker'],
      forkOptions: {stdio: 'pipe'},
      maxRetries: 3,
      numWorkers: this._globalConfig.maxWorkers,
      setupArgs: [
        {
          serializableResolvers: Array.from(resolvers.values()),
        },
      ],
    }) as WorkerInterface;

    if (worker.getStdout()) {
      worker
        .getStdout()
        .pipe(this._globalConfig.useStderr ? process.stderr : process.stdout);
    }
    if (worker.getStderr()) {
      worker.getStderr().pipe(process.stderr);
    }

    const mutex = throat(this._globalConfig.maxWorkers);

    // Send test suites to workers continuously instead of all at once to track
    // the start time of individual tests.
    const runTestInWorker = (test: JestTest) =>
      mutex(async () => {
        if (watcher.isInterrupted()) {
          return Promise.reject();
        }

        await onStart(test);

        return worker.worker({
          config: test.context.config,
          context: {
            ...this._context,
            changedFiles:
              this._context.changedFiles &&
              Array.from(this._context.changedFiles),
          },
          globalConfig: this._globalConfig,
          path: test.path,
        });
      });

    const onError = async (err: SerializableError, test: JestTest) => {
      await onFailure(test, err);
      if (err.type === 'ProcessTerminatedError') {
        console.error(
          'A worker process has quit unexpectedly! ' +
            'Most likely this is an initialization error.',
        );
        exit(1);
      }
    };

    const onInterrupt = new Promise((_, reject) => {
      watcher.on('change', (state: WatcherState) => {
        if (state.interrupted) {
          reject(new CancelRun());
        }
      });
    });

    const runAllTests = Promise.all(
      tests.map(test =>
        runTestInWorker(test)
          .then(testResult => onResult(test, testResult))
          .catch(error => onError(error, test)),
      ),
    );

    const cleanup = async () => {
      const {forceExited} = await worker.end();
      if (forceExited) {
        console.log(
          chalk.yellow(
            'A worker process has failed to exit gracefully and has been force exited. ' +
              'This is likely caused by tests leaking due to improper teardown. ' +
              'Try running with --runInBand --detectOpenHandles to find leaks.',
          ),
        );
      }
    };
    return Promise.race([runAllTests, onInterrupt]).then(cleanup, cleanup);
  }
}

class CancelRun extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'CancelRun';
  }
}

export = TestRunner;
