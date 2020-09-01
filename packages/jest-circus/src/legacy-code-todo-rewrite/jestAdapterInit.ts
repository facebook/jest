/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Circus, Config, Global} from '@jest/types';
import type {JestEnvironment} from '@jest/environment';
import {
  AssertionResult,
  Status,
  TestResult,
  createEmptyTestResult,
} from '@jest/test-result';
import {extractExpectedAssertionsErrors, getState, setState} from 'expect';
import {formatExecError, formatResultsErrors} from 'jest-message-util';
import type {TestFileEvent} from 'jest-runner';
import {
  SnapshotState,
  SnapshotStateType,
  addSerializer,
  buildSnapshotResolver,
} from 'jest-snapshot';
import {bind} from 'jest-each';
import throat from 'throat';
import {
  ROOT_DESCRIBE_BLOCK_NAME,
  addEventHandler,
  dispatch,
  getState as getRunnerState,
} from '../state';
import {getTestID} from '../utils';
import run from '../run';
import testCaseReportHandler from '../testCaseReportHandler';
import globals from '..';

type Process = NodeJS.Process;

// TODO: hard to type
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const initialize = async ({
  config,
  environment,
  getPrettier,
  getBabelTraverse,
  globalConfig,
  localRequire,
  parentProcess,
  testPath,
  sendMessageToJest,
}: {
  config: Config.ProjectConfig;
  environment: JestEnvironment;
  getPrettier: () => null | any;
  getBabelTraverse: () => Function;
  globalConfig: Config.GlobalConfig;
  localRequire: (path: Config.Path) => any;
  testPath: Config.Path;
  parentProcess: Process;
  sendMessageToJest?: TestFileEvent;
}) => {
  if (globalConfig.testTimeout) {
    getRunnerState().testTimeout = globalConfig.testTimeout;
  }

  const mutex = throat(globalConfig.maxConcurrency);

  const nodeGlobal = global as Global.Global;
  Object.assign(nodeGlobal, globals);

  nodeGlobal.xit = nodeGlobal.it.skip;
  nodeGlobal.xtest = nodeGlobal.it.skip;
  nodeGlobal.xdescribe = nodeGlobal.describe.skip;
  nodeGlobal.fit = nodeGlobal.it.only;
  nodeGlobal.fdescribe = nodeGlobal.describe.only;

  nodeGlobal.test.concurrent = (test => {
    const concurrent = (
      testName: string,
      testFn: () => Promise<unknown>,
      timeout?: number,
    ) => {
      // For concurrent tests we first run the function that returns promise, and then register a
      // nomral test that will be waiting on the returned promise (when we start the test, the promise
      // will already be in the process of execution).
      // Unfortunately at this stage there's no way to know if there are any `.only` tests in the suite
      // that will result in this test to be skipped, so we'll be executing the promise function anyway,
      // even if it ends up being skipped.
      // const promise = mutex(() => testFn());
      nodeGlobal.test(testName, testFn, timeout);
    };

    const only = (
      testName: string,
      testFn: () => Promise<unknown>,
      timeout?: number,
    ) => {
      const promise = mutex(() => testFn());
      // eslint-disable-next-line jest/no-focused-tests
      test.only(testName, () => promise, timeout);
    };

    concurrent.only = only;
    concurrent.skip = test.skip;

    concurrent.each = bind(test, false);
    concurrent.skip.each = bind(test.skip, false);
    only.each = bind(test.only, false);

    return concurrent;
  })(nodeGlobal.test);

  addEventHandler(eventHandler);

  if (environment.handleTestEvent) {
    addEventHandler(environment.handleTestEvent.bind(environment));
  }

  await dispatch({
    name: 'setup',
    parentProcess,
    testNamePattern: globalConfig.testNamePattern,
  });

  if (config.testLocationInResults) {
    await dispatch({
      name: 'include_test_location_in_result',
    });
  }

  // Jest tests snapshotSerializers in order preceding built-in serializers.
  // Therefore, add in reverse because the last added is the first tested.
  config.snapshotSerializers
    .concat()
    .reverse()
    .forEach(path => {
      addSerializer(localRequire(path));
    });

  const {expand, updateSnapshot} = globalConfig;
  const snapshotResolver = buildSnapshotResolver(config);
  const snapshotPath = snapshotResolver.resolveSnapshotPath(testPath);
  const snapshotState = new SnapshotState(snapshotPath, {
    expand,
    getBabelTraverse,
    getPrettier,
    updateSnapshot,
  });
  setState({snapshotState, testPath});

  addEventHandler(handleSnapshotStateAfterRetry(snapshotState));
  if (sendMessageToJest) {
    addEventHandler(testCaseReportHandler(testPath, sendMessageToJest));
  }

  // Return it back to the outer scope (test runner outside the VM).
  return {globals, snapshotState};
};

export const runAndTransformResultsToJestFormat = async ({
  config,
  globalConfig,
  testPath,
}: {
  config: Config.ProjectConfig;
  globalConfig: Config.GlobalConfig;
  testPath: string;
}): Promise<TestResult> => {
  const runResult: Circus.RunResult = await run();

  let numFailingTests = 0;
  let numPassingTests = 0;
  let numPendingTests = 0;
  let numTodoTests = 0;

  const assertionResults: Array<AssertionResult> = runResult.testResults.map(
    testResult => {
      let status: Status;
      if (testResult.status === 'skip') {
        status = 'pending';
        numPendingTests += 1;
      } else if (testResult.status === 'todo') {
        status = 'todo';
        numTodoTests += 1;
      } else if (testResult.errors.length) {
        status = 'failed';
        numFailingTests += 1;
      } else {
        status = 'passed';
        numPassingTests += 1;
      }

      const ancestorTitles = testResult.testPath.filter(
        name => name !== ROOT_DESCRIBE_BLOCK_NAME,
      );
      const title = ancestorTitles.pop();

      return {
        ancestorTitles,
        duration: testResult.duration,
        failureDetails: testResult.errorsDetailed,
        failureMessages: testResult.errors,
        fullName: title
          ? ancestorTitles.concat(title).join(' ')
          : ancestorTitles.join(' '),
        invocations: testResult.invocations,
        location: testResult.location,
        numPassingAsserts: 0,
        status,
        title: testResult.testPath[testResult.testPath.length - 1],
      };
    },
  );

  let failureMessage = formatResultsErrors(
    assertionResults,
    config,
    globalConfig,
    testPath,
  );
  let testExecError;

  if (runResult.unhandledErrors.length) {
    testExecError = {
      message: '',
      stack: runResult.unhandledErrors.join('\n'),
    };
    failureMessage =
      (failureMessage || '') +
      '\n\n' +
      runResult.unhandledErrors
        .map(err => formatExecError(err, config, globalConfig))
        .join('\n');
  }

  await dispatch({name: 'teardown'});

  return {
    ...createEmptyTestResult(),
    console: undefined,
    displayName: config.displayName,
    failureMessage,
    numFailingTests,
    numPassingTests,
    numPendingTests,
    numTodoTests,
    sourceMaps: {},
    testExecError,
    testFilePath: testPath,
    testResults: assertionResults,
  };
};

const handleSnapshotStateAfterRetry = (snapshotState: SnapshotStateType) => (
  event: Circus.Event,
) => {
  switch (event.name) {
    case 'test_retry': {
      // Clear any snapshot data that occurred in previous test run
      snapshotState.clear();
    }
  }
};

const eventHandler = async (event: Circus.Event) => {
  switch (event.name) {
    case 'test_start': {
      setState({currentTestName: getTestID(event.test)});
      break;
    }
    case 'test_done': {
      _addSuppressedErrors(event.test);
      _addExpectedAssertionErrors(event.test);
      break;
    }
  }
};

const _addExpectedAssertionErrors = (test: Circus.TestEntry) => {
  const failures = extractExpectedAssertionsErrors();
  const errors = failures.map(failure => failure.error);
  test.errors = test.errors.concat(errors);
};

// Get suppressed errors from ``jest-matchers`` that weren't throw during
// test execution and add them to the test result, potentially failing
// a passing test.
const _addSuppressedErrors = (test: Circus.TestEntry) => {
  const {suppressedErrors} = getState();
  setState({suppressedErrors: []});
  if (suppressedErrors.length) {
    test.errors = test.errors.concat(suppressedErrors);
  }
};
