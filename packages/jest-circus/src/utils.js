/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  AsyncFn,
  BlockMode,
  BlockName,
  DescribeBlock,
  Exception,
  Hook,
  RunResult,
  TestEntry,
  TestContext,
  TestFn,
  TestMode,
  TestName,
  TestResults,
} from 'types/Circus';
// $FlowFixMe: Converted to TS
import {convertDescriptorToString} from 'jest-util';
import isGeneratorFn from 'is-generator-fn';
import co from 'co';

import StackUtils from 'stack-utils';

// $FlowFixMe: Converted to TS
import prettyFormat from 'pretty-format';

import {getState} from './state';

const stackUtils = new StackUtils({cwd: 'A path that does not exist'});

export const makeDescribe = (
  name: BlockName,
  parent: ?DescribeBlock,
  mode?: BlockMode,
): DescribeBlock => {
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
  fn: ?TestFn,
  mode: TestMode,
  name: TestName,
  parent: DescribeBlock,
  timeout: ?number,
  asyncError: Exception,
): TestEntry => {
  let _mode = mode;
  if (!mode) {
    // if not set explicitly, inherit from its parent describe
    _mode = parent.mode;
  }

  const errors: Array<[?Exception, Exception]> = [];

  return {
    asyncError,
    duration: null,
    errors,
    fn,
    invocations: 0,
    mode: _mode,
    name: convertDescriptorToString(name),
    parent,
    startedAt: null,
    status: null,
    timeout,
  };
};

// Traverse the tree of describe blocks and return true if at least one describe
// block has an enabled test.
const hasEnabledTest = (describeBlock: DescribeBlock): boolean => {
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

export const getAllHooksForDescribe = (
  describe: DescribeBlock,
): {[key: 'beforeAll' | 'afterAll']: Array<Hook>} => {
  const result = {afterAll: [], beforeAll: []};

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

export const getEachHooksForTest = (
  test: TestEntry,
): {[key: 'beforeEach' | 'afterEach']: Array<Hook>} => {
  const result = {afterEach: [], beforeEach: []};
  let {parent: block} = test;

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

export const describeBlockHasTests = (describe: DescribeBlock) =>
  describe.tests.length || describe.children.some(describeBlockHasTests);

const _makeTimeoutMessage = (timeout, isHook) =>
  `Exceeded timeout of ${timeout}ms for a ${
    isHook ? 'hook' : 'test'
  }.\nUse jest.setTimeout(newTimeout) to increase the timeout value, if this is a long-running test.`;

// Global values can be overwritten by mocks or tests. We'll capture
// the original values in the variables before we require any files.
const {setTimeout, clearTimeout} = global;

export const callAsyncCircusFn = (
  fn: AsyncFn,
  testContext: ?TestContext,
  {isHook, timeout}: {isHook?: ?boolean, timeout: number},
): Promise<mixed> => {
  let timeoutID;

  return new Promise((resolve, reject) => {
    timeoutID = setTimeout(
      () => reject(_makeTimeoutMessage(timeout, isHook)),
      timeout,
    );

    // If this fn accepts `done` callback we return a promise that fulfills as
    // soon as `done` called.
    if (fn.length) {
      const done = (reason?: Error | string): void => {
        // $FlowFixMe: It doesn't approve of .stack
        const isError = reason && reason.message && reason.stack;
        return reason
          ? reject(
              isError
                ? reason
                : new Error(`Failed: ${prettyFormat(reason, {maxDepth: 3})}`),
            )
          : resolve();
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
      // If timeout is not cleared/unrefed the node process won't exit until
      // it's resolved.
      timeoutID.unref && timeoutID.unref();
      clearTimeout(timeoutID);
    })
    .catch(error => {
      timeoutID.unref && timeoutID.unref();
      clearTimeout(timeoutID);
      throw error;
    });
};

export const getTestDuration = (test: TestEntry): ?number => {
  const {startedAt} = test;
  return typeof startedAt === 'number' ? Date.now() - startedAt : null;
};

export const makeRunResult = (
  describeBlock: DescribeBlock,
  unhandledErrors: Array<Error>,
): RunResult => ({
  testResults: makeTestResults(describeBlock),
  unhandledErrors: unhandledErrors.map(_formatError),
});

const makeTestResults = (describeBlock: DescribeBlock, config): TestResults => {
  const {includeTestLocationInResult} = getState();
  let testResults = [];
  for (const test of describeBlock.tests) {
    const testPath = [];
    let parent = test;
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
      const {line, column} = stackUtils.parseLine(stackLine);
      location = {column, line};
    }

    testResults.push({
      duration: test.duration,
      errors: test.errors.map(_formatError),
      invocations: test.invocations,
      location,
      status,
      testPath,
    });
  }

  for (const child of describeBlock.children) {
    testResults = testResults.concat(makeTestResults(child, config));
  }

  return testResults;
};

// Return a string that identifies the test (concat of parent describe block
// names + test title)
export const getTestID = (test: TestEntry) => {
  const titles = [];
  let parent = test;
  do {
    titles.unshift(parent.name);
  } while ((parent = parent.parent));

  titles.shift(); // remove TOP_DESCRIBE_BLOCK_NAME
  return titles.join(' ');
};

const _formatError = (errors: ?Exception | [?Exception, Exception]): string => {
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
  describeBlock: DescribeBlock,
  error: Exception,
  asyncError: Exception,
) => {
  for (const test of describeBlock.tests) {
    test.errors.push([error, asyncError]);
  }

  for (const child of describeBlock.children) {
    addErrorToEachTestUnderDescribe(child, error, asyncError);
  }
};

export const invariant = (condition: *, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};
