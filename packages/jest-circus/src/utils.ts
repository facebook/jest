/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Circus} from '@jest/types';
import {convertDescriptorToString} from 'jest-util';
import isGeneratorFn from 'is-generator-fn';
import co from 'co';
import StackUtils = require('stack-utils');
import prettyFormat = require('pretty-format');
import {AssertionResult, Status} from '@jest/test-result';
import {ROOT_DESCRIBE_BLOCK_NAME, getState} from './state';

const stackUtils = new StackUtils({cwd: 'A path that does not exist'});

export const makeDescribe = (
  name: Circus.BlockName,
  parent?: Circus.DescribeBlock,
  mode?: Circus.BlockMode,
): Circus.DescribeBlock => {
  let _mode = mode;
  if (parent && !mode) {
    // If not set explicitly, inherit from the parent describe.
    _mode = parent.mode;
  }

  return {
    children: [],
    hooks: [],
    mode: _mode,
    name: convertDescriptorToString(name),
    parent,
    tests: [],
  };
};

export const makeTest = (
  fn: Circus.TestFn | undefined,
  mode: Circus.TestMode,
  name: Circus.TestName,
  parent: Circus.DescribeBlock,
  timeout: number | undefined,
  asyncError: Circus.Exception,
): Circus.TestEntry => ({
  asyncError,
  duration: null,
  errors: [],
  fn,
  invocations: 0,
  mode,
  name: convertDescriptorToString(name),
  parent,
  startedAt: null,
  status: null,
  timeout,
});

// Traverse the tree of describe blocks and return true if at least one describe
// block has an enabled test.
const hasEnabledTest = (describeBlock: Circus.DescribeBlock): boolean => {
  const {hasFocusedTests, testNamePattern} = getState();
  const hasOwnEnabledTests = describeBlock.tests.some(
    test =>
      !(
        test.mode === 'skip' ||
        (hasFocusedTests && test.mode !== 'only') ||
        (testNamePattern && !testNamePattern.test(getTestID(test)))
      ),
  );

  return hasOwnEnabledTests || describeBlock.children.some(hasEnabledTest);
};

export const getAllHooksForDescribe = (describe: Circus.DescribeBlock) => {
  const result: {
    beforeAll: Array<Circus.Hook>;
    afterAll: Array<Circus.Hook>;
  } = {
    afterAll: [],
    beforeAll: [],
  };

  if (hasEnabledTest(describe)) {
    for (const hook of describe.hooks) {
      switch (hook.type) {
        case 'beforeAll':
          result.beforeAll.push(hook);
          break;
        case 'afterAll':
          result.afterAll.push(hook);
          break;
      }
    }
  }

  return result;
};

export const getEachHooksForTest = (test: Circus.TestEntry) => {
  const result: {
    beforeEach: Array<Circus.Hook>;
    afterEach: Array<Circus.Hook>;
  } = {afterEach: [], beforeEach: []};
  let block: Circus.DescribeBlock | undefined | null = test.parent;

  do {
    const beforeEachForCurrentBlock = [];
    for (const hook of block.hooks) {
      switch (hook.type) {
        case 'beforeEach':
          beforeEachForCurrentBlock.push(hook);
          break;
        case 'afterEach':
          result.afterEach.push(hook);
          break;
      }
    }
    // 'beforeEach' hooks are executed from top to bottom, the opposite of the
    // way we traversed it.
    result.beforeEach = [...beforeEachForCurrentBlock, ...result.beforeEach];
  } while ((block = block.parent));
  return result;
};

export const describeBlockHasTests = (
  describe: Circus.DescribeBlock,
): boolean =>
  describe.tests.length > 0 || describe.children.some(describeBlockHasTests);

const _makeTimeoutMessage = (timeout: number, isHook: boolean) =>
  `Exceeded timeout of ${timeout}ms for a ${
    isHook ? 'hook' : 'test'
  }.\nUse jest.setTimeout(newTimeout) to increase the timeout value, if this is a long-running test.`;

// Global values can be overwritten by mocks or tests. We'll capture
// the original values in the variables before we require any files.
const {setTimeout, clearTimeout} = global;

function checkIsError(error: any): error is Error {
  return !!(error && (error as Error).message && (error as Error).stack);
}

export const callAsyncCircusFn = (
  fn: Circus.AsyncFn,
  testContext: Circus.TestContext | undefined,
  {isHook, timeout}: {isHook?: boolean | null; timeout: number},
): Promise<any> => {
  let timeoutID: NodeJS.Timeout;
  let completed = false;

  return new Promise((resolve, reject) => {
    timeoutID = setTimeout(
      () => reject(_makeTimeoutMessage(timeout, !!isHook)),
      timeout,
    );

    // If this fn accepts `done` callback we return a promise that fulfills as
    // soon as `done` called.
    if (fn.length) {
      const done = (reason?: Error | string): void => {
        const errorAsErrorObject = checkIsError(reason)
          ? reason
          : new Error(`Failed: ${prettyFormat(reason, {maxDepth: 3})}`);

        // Consider always throwing, regardless if `reason` is set or not
        if (completed && reason) {
          errorAsErrorObject.message =
            'Caught error after test environment was torn down\n\n' +
            errorAsErrorObject.message;

          throw errorAsErrorObject;
        }

        return reason ? reject(errorAsErrorObject) : resolve();
      };

      return fn.call(testContext, done);
    }

    let returnedValue;
    if (isGeneratorFn(fn)) {
      returnedValue = co.wrap(fn).call({});
    } else {
      try {
        returnedValue = fn.call(testContext);
      } catch (error) {
        return reject(error);
      }
    }

    // If it's a Promise, return it. Test for an object with a `then` function
    // to support custom Promise implementations.
    if (
      typeof returnedValue === 'object' &&
      returnedValue !== null &&
      typeof returnedValue.then === 'function'
    ) {
      return returnedValue.then(resolve, reject);
    }

    if (!isHook && returnedValue !== void 0) {
      return reject(
        new Error(
          `
      test functions can only return Promise or undefined.
      Returned value: ${String(returnedValue)}
      `,
        ),
      );
    }

    // Otherwise this test is synchronous, and if it didn't throw it means
    // it passed.
    return resolve();
  })
    .then(() => {
      completed = true;
      // If timeout is not cleared/unrefed the node process won't exit until
      // it's resolved.
      timeoutID.unref && timeoutID.unref();
      clearTimeout(timeoutID);
    })
    .catch(error => {
      completed = true;
      timeoutID.unref && timeoutID.unref();
      clearTimeout(timeoutID);
      throw error;
    });
};

export const getTestDuration = (test: Circus.TestEntry): number | null => {
  const {startedAt} = test;
  return typeof startedAt === 'number' ? Date.now() - startedAt : null;
};

export const makeRunResult = (
  describeBlock: Circus.DescribeBlock,
  unhandledErrors: Array<Error>,
): Circus.RunResult => ({
  testResults: makeTestResults(describeBlock),
  unhandledErrors: unhandledErrors.map(_formatError),
});

export const makeSingleTestResult = (
  test: Circus.TestEntry,
): Circus.TestResult => {
  const {includeTestLocationInResult} = getState();

  const testPath = [];
  let parent: Circus.TestEntry | Circus.DescribeBlock | undefined = test;
  do {
    testPath.unshift(parent.name);
  } while ((parent = parent.parent));

  const {status} = test;

  if (!status) {
    throw new Error('Status should be present after tests are run.');
  }

  let location = null;
  if (includeTestLocationInResult) {
    const stackLine = test.asyncError.stack.split('\n')[1];
    const parsedLine = stackUtils.parseLine(stackLine);
    if (
      parsedLine &&
      typeof parsedLine.column === 'number' &&
      typeof parsedLine.line === 'number'
    ) {
      location = {
        column: parsedLine.column,
        line: parsedLine.line,
      };
    }
  }

  return {
    duration: test.duration,
    errors: test.errors.map(_formatError),
    invocations: test.invocations,
    location,
    status,
    testPath,
  };
};

const makeTestResults = (
  describeBlock: Circus.DescribeBlock,
): Circus.TestResults => {
  let testResults: Circus.TestResults = describeBlock.tests.map(
    makeSingleTestResult,
  );

  for (const child of describeBlock.children) {
    testResults = testResults.concat(makeTestResults(child));
  }

  return testResults;
};

// Return a string that identifies the test (concat of parent describe block
// names + test title)
export const getTestID = (test: Circus.TestEntry) => {
  const titles = [];
  let parent: Circus.TestEntry | Circus.DescribeBlock | undefined = test;
  do {
    titles.unshift(parent.name);
  } while ((parent = parent.parent));

  titles.shift(); // remove TOP_DESCRIBE_BLOCK_NAME
  return titles.join(' ');
};

const _formatError = (
  errors?: Circus.Exception | [Circus.Exception | undefined, Circus.Exception],
): string => {
  let error;
  let asyncError;

  if (Array.isArray(errors)) {
    error = errors[0];
    asyncError = errors[1];
  } else {
    error = errors;
    asyncError = new Error();
  }

  if (error) {
    if (error.stack) {
      return error.stack;
    }
    if (error.message) {
      return error.message;
    }
  }

  asyncError.message = `thrown: ${prettyFormat(error, {maxDepth: 3})}`;

  return asyncError.stack;
};

export const addErrorToEachTestUnderDescribe = (
  describeBlock: Circus.DescribeBlock,
  error: Circus.Exception,
  asyncError: Circus.Exception,
) => {
  for (const test of describeBlock.tests) {
    test.errors.push([error, asyncError]);
  }

  for (const child of describeBlock.children) {
    addErrorToEachTestUnderDescribe(child, error, asyncError);
  }
};

export const invariant = (condition: unknown, message?: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const parseSingleTestResult = (
  testResult: Circus.TestResult,
): AssertionResult => {
  let status: Status;
  if (testResult.status === 'skip') {
    status = 'pending';
  } else if (testResult.status === 'todo') {
    status = 'todo';
  } else if (testResult.errors.length) {
    status = 'failed';
  } else {
    status = 'passed';
  }

  const ancestorTitles = testResult.testPath.filter(
    name => name !== ROOT_DESCRIBE_BLOCK_NAME,
  );
  const title = ancestorTitles.pop();

  return {
    ancestorTitles,
    duration: testResult.duration,
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
};

export const parseTestResults = (testResults: Array<Circus.TestResult>) => {
  let numFailingTests = 0;
  let numPassingTests = 0;
  let numPendingTests = 0;
  let numTodoTests = 0;

  const assertionResults: Array<AssertionResult> = testResults.map(
    testResult => {
      if (testResult.status === 'skip') {
        numPendingTests += 1;
      } else if (testResult.status === 'todo') {
        numTodoTests += 1;
      } else if (testResult.errors.length) {
        numFailingTests += 1;
      } else {
        numPassingTests += 1;
      }

      return parseSingleTestResult(testResult);
    },
  );

  return {
    assertionResults,
    numFailingTests,
    numPassingTests,
    numPendingTests,
    numTodoTests,
  };
};
