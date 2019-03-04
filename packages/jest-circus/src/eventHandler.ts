/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {EventHandler, TEST_TIMEOUT_SYMBOL} from './types';

import {
  addErrorToEachTestUnderDescribe,
  makeDescribe,
  getTestDuration,
  invariant,
  makeTest,
  describeBlockHasTests,
} from './utils';
import {
  injectGlobalErrorHandlers,
  restoreGlobalErrorHandlers,
} from './globalErrorHandlers';

const eventHandler: EventHandler = (event, state): void => {
  switch (event.name) {
    case 'include_test_location_in_result': {
      state.includeTestLocationInResult = true;
      break;
    }
    case 'hook_start': {
      break;
    }
    case 'start_describe_definition': {
      const {blockName, mode} = event;
      const {currentDescribeBlock} = state;
      const describeBlock = makeDescribe(blockName, currentDescribeBlock, mode);
      currentDescribeBlock.children.push(describeBlock);
      state.currentDescribeBlock = describeBlock;
      break;
    }
    case 'finish_describe_definition': {
      const {currentDescribeBlock} = state;
      invariant(currentDescribeBlock, `currentDescribeBlock must be there`);

      if (!describeBlockHasTests(currentDescribeBlock)) {
        currentDescribeBlock.hooks.forEach(hook => {
          hook.asyncError.message = `Invalid: ${
            hook.type
          }() may not be used in a describe block containing no tests.`;
          state.unhandledErrors.push(hook.asyncError);
        });
      }

      // inherit mode from its parent describe but
      // do not inherit "only" mode when there is already tests with "only" mode
      const shouldInheritMode = !(
        currentDescribeBlock.mode === 'only' &&
        currentDescribeBlock.tests.find(test => test.mode === 'only')
      );

      if (shouldInheritMode) {
        currentDescribeBlock.tests.forEach(test => {
          if (!test.mode) {
            test.mode = currentDescribeBlock.mode;
          }
        });
      }

      if (
        !state.hasFocusedTests &&
        currentDescribeBlock.tests.some(test => test.mode === 'only')
      ) {
        state.hasFocusedTests = true;
      }

      if (currentDescribeBlock.parent) {
        state.currentDescribeBlock = currentDescribeBlock.parent;
      }
      break;
    }
    case 'add_hook': {
      const {currentDescribeBlock} = state;
      const {asyncError, fn, hookType: type, timeout} = event;
      const parent = currentDescribeBlock;
      currentDescribeBlock.hooks.push({asyncError, fn, parent, timeout, type});
      break;
    }
    case 'add_test': {
      const {currentDescribeBlock} = state;
      const {asyncError, fn, mode, testName: name, timeout} = event;
      const test = makeTest(
        fn,
        mode,
        name,
        currentDescribeBlock,
        timeout,
        asyncError,
      );
      if (test.mode === 'only') {
        state.hasFocusedTests = true;
      }
      currentDescribeBlock.tests.push(test);
      break;
    }
    case 'hook_failure': {
      const {test, describeBlock, error, hook} = event;
      const {asyncError, type} = hook;

      if (type === 'beforeAll') {
        invariant(describeBlock, 'always present for `*All` hooks');
        addErrorToEachTestUnderDescribe(describeBlock!, error, asyncError);
      } else if (type === 'afterAll') {
        // Attaching `afterAll` errors to each test makes execution flow
        // too complicated, so we'll consider them to be global.
        state.unhandledErrors.push(new Array(error, asyncError));
      } else {
        invariant(test, 'always present for `*Each` hooks');
        test!.errors.push(new Array(error, asyncError));
      }
      break;
    }
    case 'test_skip': {
      event.test.status = 'skip';
      break;
    }
    case 'test_todo': {
      event.test.status = 'todo';
      break;
    }
    case 'test_done': {
      event.test.duration = getTestDuration(event.test);
      event.test.status = 'done';
      state.currentlyRunningTest = null;
      break;
    }
    case 'test_start': {
      state.currentlyRunningTest = event.test;
      event.test.startedAt = Date.now();
      event.test.invocations += 1;
      break;
    }
    case 'test_fn_failure': {
      const {
        error,
        test: {asyncError},
      } = event;
      event.test.errors.push(new Array(error, asyncError));
      break;
    }
    case 'test_retry': {
      event.test.errors = new Array();
      break;
    }
    case 'run_start': {
      global[TEST_TIMEOUT_SYMBOL] &&
        (state.testTimeout = global[TEST_TIMEOUT_SYMBOL]);
      break;
    }
    case 'run_finish': {
      break;
    }
    case 'setup': {
      // Uncaught exception handlers should be defined on the parent process
      // object. If defined on the VM's process object they just no op and let
      // the parent process crash. It might make sense to return a `dispatch`
      // function to the parent process and register handlers there instead, but
      // i'm not sure if this is works. For now i just replicated whatever
      // jasmine was doing -- dabramov
      state.parentProcess = event.parentProcess;
      invariant(state.parentProcess);
      state.originalGlobalErrorHandlers = injectGlobalErrorHandlers(
        state.parentProcess,
      );
      if (event.testNamePattern) {
        state.testNamePattern = new RegExp(event.testNamePattern, 'i');
      }
      break;
    }
    case 'teardown': {
      invariant(state.originalGlobalErrorHandlers);
      invariant(state.parentProcess);
      restoreGlobalErrorHandlers(
        state.parentProcess!,
        state.originalGlobalErrorHandlers!,
      );
      break;
    }
    case 'error': {
      // It's very likely for long-running async tests to throw errors. In this
      // case we want to catch them and fail the current test. At the same time
      // there's a possibility that one test sets a long timeout, that will
      // eventually throw after this test finishes but during some other test
      // execution, which will result in one test's error failing another test.
      // In any way, it should be possible to track where the error was thrown
      // from.
      state.currentlyRunningTest
        ? state.currentlyRunningTest.errors.push(event.error)
        : state.unhandledErrors.push(event.error);
      break;
    }
  }
};

export default eventHandler;
