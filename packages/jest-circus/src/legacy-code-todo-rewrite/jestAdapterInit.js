/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AssertionResult, TestResult, Status} from 'types/TestResult';
import type {GlobalConfig, Path, ProjectConfig} from 'types/Config';
import type {Event, RunResult, TestEntry} from 'types/Circus';

import {extractExpectedAssertionsErrors, getState, setState} from 'expect';
import {formatExecError, formatResultsErrors} from 'jest-message-util';
import {
  SnapshotState,
  addSerializer,
  buildSnapshotResolver,
} from 'jest-snapshot';
import throat from 'throat';
import {addEventHandler, dispatch, ROOT_DESCRIBE_BLOCK_NAME} from '../state';
import {getTestID} from '../utils';
import run from '../run';
// eslint-disable-next-line import/default
import globals from '../index';

export const initialize = ({
  config,
  getPrettier,
  getBabelTraverse,
  globalConfig,
  localRequire,
  parentProcess,
  testPath,
}: {
  config: ProjectConfig,
  getPrettier: () => null | any,
  getBabelTraverse: () => Function,
  globalConfig: GlobalConfig,
  localRequire: Path => any,
  testPath: Path,
  parentProcess: Process,
}) => {
  const mutex = throat(globalConfig.maxConcurrency);

  Object.assign(global, globals);

  global.xit = global.it.skip;
  global.xtest = global.it.skip;
  global.xdescribe = global.describe.skip;
  global.fit = global.it.only;
  global.fdescribe = global.describe.only;

  global.test.concurrent = (
    testName: string,
    testFn: () => Promise<any>,
    timeout?: number,
  ) => {
    // For concurrent tests we first run the function that returns promise, and then register a
    // nomral test that will be waiting on the returned promise (when we start the test, the promise
    // will already be in the process of execution).
    // Unfortunately at this stage there's no way to know if there are any `.only` tests in the suite
    // that will result in this test to be skipped, so we'll be executing the promise function anyway,
    // even if it ends up being skipped.
    const promise = mutex(() => testFn());
    global.test(testName, () => promise, timeout);
  };

  global.test.concurrent.only = (
    testName: string,
    testFn: () => Promise<any>,
    timeout?: number,
  ) => {
    const promise = mutex(() => testFn());
    global.test.only(testName, () => promise, timeout);
  };

  global.test.concurrent.skip = global.test.skip;

  addEventHandler(eventHandler);

  dispatch({
    name: 'setup',
    parentProcess,
    testNamePattern: globalConfig.testNamePattern,
  });

  if (config.testLocationInResults) {
    dispatch({
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

  // Return it back to the outer scope (test runner outside the VM).
  return {globals, snapshotState};
};

export const runAndTransformResultsToJestFormat = async ({
  config,
  globalConfig,
  testPath,
}: {
  config: ProjectConfig,
  globalConfig: GlobalConfig,
  testPath: string,
}): Promise<TestResult> => {
  const runResult: RunResult = await run();

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
        failureMessages: testResult.errors,
        fullName: ancestorTitles.concat(title).join(' '),
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

  dispatch({name: 'teardown'});
  return {
    console: null,
    displayName: config.displayName,
    failureMessage,
    leaks: false, // That's legacy code, just adding it so Flow is happy.
    numFailingTests,
    numPassingTests,
    numPendingTests,
    numTodoTests,
    openHandles: [],
    perfStats: {
      // populated outside
      end: 0,
      start: 0,
    },
    skipped: false,
    snapshot: {
      added: 0,
      fileDeleted: false,
      matched: 0,
      unchecked: 0,
      uncheckedKeys: [],
      unmatched: 0,
      updated: 0,
    },
    sourceMaps: {},
    testExecError,
    testFilePath: testPath,
    testResults: assertionResults,
  };
};

const eventHandler = (event: Event) => {
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

const _addExpectedAssertionErrors = (test: TestEntry) => {
  const failures = extractExpectedAssertionsErrors();
  const errors = failures.map(failure => failure.error);
  test.errors = test.errors.concat(errors);
};

// Get suppressed errors from ``jest-matchers`` that weren't throw during
// test execution and add them to the test result, potentially failing
// a passing test.
const _addSuppressedErrors = (test: TestEntry) => {
  const {suppressedErrors} = getState();
  setState({suppressedErrors: []});
  if (suppressedErrors.length) {
    test.errors = test.errors.concat(suppressedErrors);
  }
};
