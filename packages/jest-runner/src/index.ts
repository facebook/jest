/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk = require('chalk');
import Emittery = require('emittery');
import exit = require('exit');
import throat from 'throat';
import type {
  SerializableError,
  Test,
  TestEvents,
  TestFileEvent,
  TestResult,
} from '@jest/test-result';
import type {Config} from '@jest/types';
import {deepCyclicCopy} from 'jest-util';
import {PromiseWithCustomMessage, Worker} from 'jest-worker';
import runTest from './runTest';
import type {SerializableResolver, worker} from './testWorker';
import type {
  OnTestFailure,
  OnTestStart,
  OnTestSuccess,
  TestRunnerContext,
  TestRunnerOptions,
  TestWatcher,
} from './types';

// TODO: remove re-export in Jest 28
export type {Test, TestFileEvent, TestEvents} from '@jest/test-result';

const TEST_WORKER_PATH = require.resolve('./testWorker');

interface WorkerInterface extends Worker {
  worker: typeof worker;
}

export type {
  OnTestFailure,
  OnTestStart,
  OnTestSuccess,
  TestWatcher,
  TestRunnerContext,
  TestRunnerOptions,
} from './types';

export default class TestRunner {
  private readonly _globalConfig: Config.GlobalConfig;
  private readonly _context: TestRunnerContext;
  private readonly eventEmitter = new Emittery<TestEvents>();
  readonly __PRIVATE_UNSTABLE_API_supportsEventEmitters__: boolean = true;

  readonly isSerial?: boolean;

  constructor(globalConfig: Config.GlobalConfig, context?: TestRunnerContext) {
    this._globalConfig = globalConfig;
    this._context = context || {};
  }

  async runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    onStart: OnTestStart | undefined,
    onResult: OnTestSuccess | undefined,
    onFailure: OnTestFailure | undefined,
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

  private async _createInBandTestRun(
    tests: Array<Test>,
    watcher: TestWatcher,
    onStart?: OnTestStart,
    onResult?: OnTestSuccess,
    onFailure?: OnTestFailure,
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
              let sendMessageToJest: TestFileEvent;

              // Remove `if(onStart)` in Jest 27
              if (onStart) {
                await onStart(test);
                return runTest(
                  test.path,
                  this._globalConfig,
                  test.context.config,
                  test.context.resolver,
                  this._context,
                  undefined,
                );
              } else {
                // `deepCyclicCopy` used here to avoid mem-leak
                sendMessageToJest = (eventName, args) =>
                  this.eventEmitter.emit(
                    eventName,
                    deepCyclicCopy(args, {keepPrototype: false}),
                  );

                await this.eventEmitter.emit('test-file-start', [test]);
                return runTest(
                  test.path,
                  this._globalConfig,
                  test.context.config,
                  test.context.resolver,
                  this._context,
                  sendMessageToJest,
                );
              }
            })
            .then(result => {
              if (onResult) {
                return onResult(test, result);
              } else {
                return this.eventEmitter.emit('test-file-success', [
                  test,
                  result,
                ]);
              }
            })
            .catch(err => {
              if (onFailure) {
                return onFailure(test, err);
              } else {
                return this.eventEmitter.emit('test-file-failure', [test, err]);
              }
            }),
        ),
      Promise.resolve(),
    );
  }

  private async _createParallelTestRun(
    tests: Array<Test>,
    watcher: TestWatcher,
    onStart?: OnTestStart,
    onResult?: OnTestSuccess,
    onFailure?: OnTestFailure,
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

    if (worker.getStdout()) worker.getStdout().pipe(process.stdout);
    if (worker.getStderr()) worker.getStderr().pipe(process.stderr);

    const mutex = throat(this._globalConfig.maxWorkers);

    // Send test suites to workers continuously instead of all at once to track
    // the start time of individual tests.
    const runTestInWorker = (test: Test) =>
      mutex(async () => {
        if (watcher.isInterrupted()) {
          return Promise.reject();
        }

        // Remove `if(onStart)` in Jest 27
        if (onStart) {
          await onStart(test);
        } else {
          await this.eventEmitter.emit('test-file-start', [test]);
        }

        const promise = worker.worker({
          config: test.context.config,
          context: {
            ...this._context,
            changedFiles:
              this._context.changedFiles &&
              Array.from(this._context.changedFiles),
            sourcesRelatedToTestsInChangedFiles:
              this._context.sourcesRelatedToTestsInChangedFiles &&
              Array.from(this._context.sourcesRelatedToTestsInChangedFiles),
          },
          globalConfig: this._globalConfig,
          path: test.path,
        }) as PromiseWithCustomMessage<TestResult>;

        if (promise.UNSTABLE_onCustomMessage) {
          // TODO: Get appropriate type for `onCustomMessage`
          promise.UNSTABLE_onCustomMessage(([event, payload]: any) => {
            this.eventEmitter.emit(event, payload);
          });
        }

        return promise;
      });

    const onError = async (err: SerializableError, test: Test) => {
      // Remove `if(onFailure)` in Jest 27
      if (onFailure) {
        await onFailure(test, err);
      } else {
        await this.eventEmitter.emit('test-file-failure', [test, err]);
      }
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

    const parallelTests = tests.filter(test => !test.context.config.runInBand);
    const inBandTests = tests.filter(test => test.context.config.runInBand);

    // Then we group the in band tests by their projectId
    const inBandProjectGroups = inBandTests.reduce(
      (groups, test) => ({
        ...groups,
        [test.context.config.name]: (
          groups[test.context.config.name] || []
        ).concat([test]),
      }),
      {} as Record<string, Array<Test>>,
    );

    const doTest = (test: Test) =>
      runTestInWorker(test)
        .then(result => {
          if (onResult) {
            return onResult(test, result);
          }
          return this.eventEmitter.emit('test-file-success', [test, result]);
        })
        .catch(error => onError(error, test));

    const runAllTests = Promise.all([
      // Go through each project which needs to be run in band,
      // and make a promise chain to execute all the tests in the
      // project in band
      ...Object.values(inBandProjectGroups).map(group =>
        group.reduce(
          (previousTest, test) => previousTest.then(() => doTest(test)),
          Promise.resolve(),
        ),
      ),
      // Resolve as a promise, to make sure the inband projects
      // have the same priority
      ...(await Promise.resolve().then(() => parallelTests.map(doTest))),
    ]);

    const cleanup = async () => {
      const {forceExited} = await worker.end();
      if (forceExited) {
        console.error(
          chalk.yellow(
            'A worker process has failed to exit gracefully and has been force exited. ' +
              'This is likely caused by tests leaking due to improper teardown. ' +
              'Try running with --detectOpenHandles to find leaks.',
          ),
        );
      }
    };
    return Promise.race([runAllTests, onInterrupt]).then(cleanup, cleanup);
  }

  on<Name extends keyof TestEvents>(
    eventName: Name,
    listener: (eventData: TestEvents[Name]) => void | Promise<void>,
  ): Emittery.UnsubscribeFn {
    return this.eventEmitter.on(eventName, listener);
  }
}

class CancelRun extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'CancelRun';
  }
}
