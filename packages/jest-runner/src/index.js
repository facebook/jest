/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig} from 'types/Config';
import type {
  OnTestFailure,
  OnTestStart,
  OnTestSuccess,
  Test,
  TestRunnerContext,
  TestRunnerOptions,
  TestWatcher,
} from 'types/TestRunner';

import typeof {worker} from './testWorker';

import exit from 'exit';
import runTest from './runTest';
import throat from 'throat';
import Worker from 'jest-worker';

const TEST_WORKER_PATH = require.resolve('./testWorker');

type WorkerInterface = Worker & {worker: worker};

class TestRunner {
  _globalConfig: GlobalConfig;
  _context: TestRunnerContext;

  constructor(globalConfig: GlobalConfig, context?: TestRunnerContext) {
    this._globalConfig = globalConfig;
    this._context = context || {};
  }

  async runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    onStart: OnTestStart,
    onResult: OnTestSuccess,
    onFailure: OnTestFailure,
    options: TestRunnerOptions,
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

  async _createInBandTestRun(
    tests: Array<Test>,
    watcher: TestWatcher,
    onStart: OnTestStart,
    onResult: OnTestSuccess,
    onFailure: OnTestFailure,
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

  async _createParallelTestRun(
    tests: Array<Test>,
    watcher: TestWatcher,
    onStart: OnTestStart,
    onResult: OnTestSuccess,
    onFailure: OnTestFailure,
  ) {
    // $FlowFixMe: class object is augmented with worker when instantiating.
    const worker: WorkerInterface = new Worker(TEST_WORKER_PATH, {
      exposedMethods: ['worker'],
      forkOptions: {stdio: 'pipe'},
      maxRetries: 3,
      numWorkers: this._globalConfig.maxWorkers,
    });

    if (worker.getStdout()) worker.getStdout().pipe(process.stdout);
    if (worker.getStderr()) worker.getStderr().pipe(process.stderr);

    const mutex = throat(this._globalConfig.maxWorkers);

    // Send test suites to workers continuously instead of all at once to track
    // the start time of individual tests.
    const runTestInWorker = test =>
      mutex(async () => {
        if (watcher.isInterrupted()) {
          return Promise.reject();
        }

        await onStart(test);

        return worker.worker({
          config: test.context.config,
          context: this._context,
          globalConfig: this._globalConfig,
          path: test.path,
          serializableModuleMap: watcher.isWatchMode()
            ? test.context.moduleMap.toJSON()
            : null,
        });
      });

    const onError = async (err, test) => {
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
      watcher.on('change', state => {
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

    const cleanup = () => worker.end();
    return Promise.race([runAllTests, onInterrupt]).then(cleanup, cleanup);
  }
}

class CancelRun extends Error {
  constructor(message: ?string) {
    super(message);
    this.name = 'CancelRun';
  }
}

module.exports = TestRunner;
