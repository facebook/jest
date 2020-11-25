/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Circus} from '@jest/types';
import {dispatch, getState} from './state';
import {RETRY_TIMES} from './types';
import {
  callAsyncCircusFn,
  getAllHooksForDescribe,
  getEachHooksForTest,
  getTestID,
  invariant,
  makeRunResult,
} from './utils';

const run = async (): Promise<Circus.RunResult> => {
  const {rootDescribeBlock} = getState();
  await dispatch({name: 'run_start'});
  await _runTestsForDescribeBlock(rootDescribeBlock);
  await dispatch({name: 'run_finish'});
  return makeRunResult(
    getState().rootDescribeBlock,
    getState().unhandledErrors,
  );
};

const _runTestsForDescribeBlock = async (
  describeBlock: Circus.DescribeBlock,
) => {
  await dispatch({describeBlock, name: 'run_describe_start'});
  const {beforeAll, afterAll} = getAllHooksForDescribe(describeBlock);

  for (const hook of beforeAll) {
    if (describeBlock.errors.length > 0) {
      // discontinue running beforeAll hooks on failure
      break;
    }
    await _callCircusHook({describeBlock, hook});
  }

  if (describeBlock.errors.length === 0) {
    // Tests that fail and are retried we run after other tests
    const retryTimes = parseInt(global[RETRY_TIMES], 10) || 0;
    const deferredRetryTests = [];
    for (const child of describeBlock.children) {
      switch (child.type) {
        case 'describeBlock': {
          await _runTestsForDescribeBlock(child);
          break;
        }
        case 'test': {
          await _runTest(child);
          if (retryTimes > 0 && child.errors.length > 0) {
            deferredRetryTests.push(child);
          }
          break;
        }
      }
    }
    // Re-run failed tests n-times if configured
    for (const test of deferredRetryTests) {
      let numRetriesAvailable = retryTimes;

      while (numRetriesAvailable > 0 && test.errors.length > 0) {
        // Clear errors so retries occur
        await dispatch({name: 'test_retry', test});

        await _runTest(test);
        numRetriesAvailable--;
      }
    }
  }

  for (const hook of afterAll) {
    await _callCircusHook({describeBlock, hook});
  }

  await dispatch({describeBlock, name: 'run_describe_finish'});
};

const _runTest = async (test: Circus.TestEntry): Promise<void> => {
  await dispatch({name: 'test_start', test});
  const testContext = Object.create(null);
  const {hasFocusedTests, testNamePattern} = getState();

  const isSkipped =
    test.mode === 'skip' ||
    (hasFocusedTests && test.mode !== 'only') ||
    (testNamePattern && !testNamePattern.test(getTestID(test)));

  if (isSkipped) {
    await dispatch({name: 'test_skip', test});
    return;
  }

  if (test.mode === 'todo') {
    await dispatch({name: 'test_todo', test});
    return;
  }

  const {afterEach, beforeEach} = getEachHooksForTest(test);

  for (const hook of beforeEach) {
    if (test.errors.length > 0) {
      // If any of the before hooks failed already, we don't run any
      // hooks after that.
      break;
    }
    await _callCircusHook({hook, test, testContext});
  }

  if (test.errors.length === 0) {
    await _callCircusTest(test, testContext);
  }

  for (const hook of afterEach) {
    await _callCircusHook({hook, test, testContext});
  }

  // `afterAll` hooks should not affect test status (pass or fail), because if
  // we had a global `afterAll` hook it would block all existing tests until
  // this hook is executed. So we dispatch `test_done` right away.
  await dispatch({name: 'test_done', test});
};

const _callCircusHook = async ({
  hook,
  test,
  describeBlock,
  testContext,
}: {
  hook: Circus.Hook;
  describeBlock?: Circus.DescribeBlock;
  test?: Circus.TestEntry;
  testContext?: Circus.TestContext;
}): Promise<void> => {
  await dispatch({hook, name: 'hook_start'});
  const timeout = hook.timeout || getState().testTimeout;

  try {
    await callAsyncCircusFn(hook, testContext, {
      isHook: true,
      timeout,
    });
    await dispatch({describeBlock, hook, name: 'hook_success', test});
  } catch (error) {
    await dispatch({describeBlock, error, hook, name: 'hook_failure', test});
  }
};

const _callCircusTest = async (
  test: Circus.TestEntry,
  testContext: Circus.TestContext,
): Promise<void> => {
  await dispatch({name: 'test_fn_start', test});
  const timeout = test.timeout || getState().testTimeout;
  invariant(test.fn, `Tests with no 'fn' should have 'mode' set to 'skipped'`);

  try {
    await callAsyncCircusFn(test, testContext, {
      isHook: false,
      timeout,
    });
    await dispatch({name: 'test_fn_success', test});
  } catch (error) {
    await dispatch({error, name: 'test_fn_failure', test});
  }
};

export default run;
