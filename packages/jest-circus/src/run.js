/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  RunResult,
  TestEntry,
  TestContext,
  Hook,
  DescribeBlock,
} from 'types/Circus';

import {getState, dispatch} from './state';
import {
  callAsyncCircusFn,
  getAllHooksForDescribe,
  getEachHooksForTest,
  getTestID,
  invariant,
  makeRunResult,
} from './utils';

const run = async (): Promise<RunResult> => {
  const {rootDescribeBlock} = getState();
  dispatch({name: 'run_start'});
  await _runTestsForDescribeBlock(rootDescribeBlock);
  dispatch({name: 'run_finish'});
  return makeRunResult(
    getState().rootDescribeBlock,
    getState().unhandledErrors,
  );
};

const _runTestsForDescribeBlock = async (describeBlock: DescribeBlock) => {
  dispatch({describeBlock, name: 'run_describe_start'});
  const {beforeAll, afterAll} = getAllHooksForDescribe(describeBlock);

  for (const hook of beforeAll) {
    await _callCircusHook({describeBlock, hook});
  }

  // Tests that fail and are retried we run after other tests
  const retryTimes = parseInt(global[Symbol.for('RETRY_TIMES')], 10) || 0;
  const deferredRetryTests = [];

  for (const test of describeBlock.tests) {
    await _runTest(test);

    if (retryTimes > 0 && test.errors.length > 0) {
      deferredRetryTests.push(test);
    }
  }

  // Re-run failed tests n-times if configured
  for (const test of deferredRetryTests) {
    let numRetriesAvailable = retryTimes;

    while (numRetriesAvailable > 0 && test.errors.length > 0) {
      // Clear errors so retries occur
      dispatch({name: 'test_retry', test});

      await _runTest(test);
      numRetriesAvailable--;
    }
  }

  for (const child of describeBlock.children) {
    await _runTestsForDescribeBlock(child);
  }

  for (const hook of afterAll) {
    await _callCircusHook({describeBlock, hook});
  }
  dispatch({describeBlock, name: 'run_describe_finish'});
};

const _runTest = async (test: TestEntry): Promise<void> => {
  dispatch({name: 'test_start', test});
  const testContext = Object.create(null);
  const {hasFocusedTests, testNamePattern} = getState();

  const isSkipped =
    test.mode === 'skip' ||
    (hasFocusedTests && test.mode !== 'only') ||
    (testNamePattern && !testNamePattern.test(getTestID(test)));

  if (isSkipped) {
    dispatch({name: 'test_skip', test});
    return;
  }

  if (test.mode === 'todo') {
    dispatch({name: 'test_todo', test});
    return;
  }

  const {afterEach, beforeEach} = getEachHooksForTest(test);

  for (const hook of beforeEach) {
    if (test.errors.length) {
      // If any of the before hooks failed already, we don't run any
      // hooks after that.
      break;
    }
    await _callCircusHook({hook, test, testContext});
  }

  await _callCircusTest(test, testContext);

  for (const hook of afterEach) {
    await _callCircusHook({hook, test, testContext});
  }

  // `afterAll` hooks should not affect test status (pass or fail), because if
  // we had a global `afterAll` hook it would block all existing tests until
  // this hook is executed. So we dispatch `test_done` right away.
  dispatch({name: 'test_done', test});
};

const _callCircusHook = ({
  hook,
  test,
  describeBlock,
  testContext,
}: {
  hook: Hook,
  describeBlock?: DescribeBlock,
  test?: TestEntry,
  testContext?: TestContext,
}): Promise<mixed> => {
  dispatch({hook, name: 'hook_start'});
  const timeout = hook.timeout || getState().testTimeout;
  return callAsyncCircusFn(hook.fn, testContext, {isHook: true, timeout})
    .then(() => dispatch({describeBlock, hook, name: 'hook_success', test}))
    .catch(error =>
      dispatch({describeBlock, error, hook, name: 'hook_failure', test}),
    );
};

const _callCircusTest = (
  test: TestEntry,
  testContext: TestContext,
): Promise<void> => {
  dispatch({name: 'test_fn_start', test});
  const timeout = test.timeout || getState().testTimeout;
  invariant(test.fn, `Tests with no 'fn' should have 'mode' set to 'skipped'`);

  if (test.errors.length) {
    // We don't run the test if there's already an error in before hooks.
    return Promise.resolve();
  }

  return callAsyncCircusFn(test.fn, testContext, {isHook: false, timeout})
    .then(() => dispatch({name: 'test_fn_success', test}))
    .catch(error => dispatch({error, name: 'test_fn_failure', test}));
};

export default run;
