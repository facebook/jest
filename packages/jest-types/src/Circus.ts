/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as Global from './Global';

type Process = NodeJS.Process;

export type DoneFn = Global.DoneFn;
export type BlockFn = Global.BlockFn;
export type BlockName = Global.BlockName;
export type BlockMode = void | 'skip' | 'only' | 'todo';
export type TestMode = BlockMode;
export type TestName = Global.TestName;
export type TestFn = Global.TestFn;
export type HookFn = Global.HookFn;
export type AsyncFn = TestFn | HookFn;
export type SharedHookType = 'afterAll' | 'beforeAll';
export type HookType = SharedHookType | 'afterEach' | 'beforeEach';
export type TestContext = Global.TestContext;
export type Exception = any; // Since in JS anything can be thrown as an error.
export type FormattedError = string; // String representation of error.
export type Hook = {
  asyncError: Error;
  fn: HookFn;
  type: HookType;
  parent: DescribeBlock;
  seenDone: boolean;
  timeout: number | undefined | null;
};

export interface EventHandler {
  (event: AsyncEvent, state: State): void | Promise<void>;
  (event: SyncEvent, state: State): void;
}

export type Event = SyncEvent | AsyncEvent;

interface JestGlobals extends Global.TestFrameworkGlobals {
  // we cannot type `expect` properly as it'd create circular dependencies
  expect: unknown;
}

export type SyncEvent =
  | {
      asyncError: Error;
      mode: BlockMode;
      name: 'start_describe_definition';
      blockName: BlockName;
    }
  | {
      mode: BlockMode;
      name: 'finish_describe_definition';
      blockName: BlockName;
    }
  | {
      asyncError: Error;
      name: 'add_hook';
      hookType: HookType;
      fn: HookFn;
      timeout: number | undefined;
    }
  | {
      asyncError: Error;
      name: 'add_test';
      testName: TestName;
      fn: TestFn;
      mode?: TestMode;
      timeout: number | undefined;
    }
  | {
      // Any unhandled error that happened outside of test/hooks (unless it is
      // an `afterAll` hook)
      name: 'error';
      error: Exception;
    };

export type AsyncEvent =
  | {
      // first action to dispatch. Good time to initialize all settings
      name: 'setup';
      testNamePattern?: string;
      runtimeGlobals: JestGlobals;
      parentProcess: Process;
    }
  | {
      name: 'include_test_location_in_result';
    }
  | {
      name: 'hook_start';
      hook: Hook;
    }
  | {
      name: 'hook_success';
      describeBlock?: DescribeBlock;
      test?: TestEntry;
      hook: Hook;
    }
  | {
      name: 'hook_failure';
      error: string | Exception;
      describeBlock?: DescribeBlock;
      test?: TestEntry;
      hook: Hook;
    }
  | {
      name: 'test_fn_start';
      test: TestEntry;
    }
  | {
      name: 'test_fn_success';
      test: TestEntry;
    }
  | {
      name: 'test_fn_failure';
      error: Exception;
      test: TestEntry;
    }
  | {
      name: 'test_retry';
      test: TestEntry;
    }
  | {
      // the `test` in this case is all hooks + it/test function, not just the
      // function passed to `it/test`
      name: 'test_start';
      test: TestEntry;
    }
  | {
      name: 'test_skip';
      test: TestEntry;
    }
  | {
      name: 'test_todo';
      test: TestEntry;
    }
  | {
      // test failure is defined by presence of errors in `test.errors`,
      // `test_done` indicates that the test and all its hooks were run,
      // and nothing else will change it's state in the future. (except third
      // party extentions/plugins)
      name: 'test_done';
      test: TestEntry;
    }
  | {
      name: 'run_describe_start';
      describeBlock: DescribeBlock;
    }
  | {
      name: 'run_describe_finish';
      describeBlock: DescribeBlock;
    }
  | {
      name: 'run_start';
    }
  | {
      name: 'run_finish';
    }
  | {
      // Action dispatched after everything is finished and we're about to wrap
      // things up and return test results to the parent process (caller).
      name: 'teardown';
    };

export type MatcherResults = {
  actual: unknown;
  expected: unknown;
  name: string;
  pass: boolean;
};

export type TestStatus = 'skip' | 'done' | 'todo';
export type TestResult = {
  duration?: number | null;
  errors: Array<FormattedError>;
  errorsDetailed: Array<MatcherResults | unknown>;
  invocations: number;
  status: TestStatus;
  location?: {column: number; line: number} | null;
  testPath: Array<TestName | BlockName>;
};

export type RunResult = {
  unhandledErrors: Array<FormattedError>;
  testResults: TestResults;
};

export type TestResults = Array<TestResult>;

export type GlobalErrorHandlers = {
  uncaughtException: Array<(exception: Exception) => void>;
  unhandledRejection: Array<
    (exception: Exception, promise: Promise<unknown>) => void
  >;
};

export type State = {
  currentDescribeBlock: DescribeBlock;
  currentlyRunningTest?: TestEntry | null; // including when hooks are being executed
  currentlyRunningChildDeadline: number | null;
  expand?: boolean; // expand error messages
  hasFocusedTests: boolean; // that are defined using test.only
  hasStarted: boolean; // whether the rootDescribeBlock has started running
  // Store process error handlers. During the run we inject our own
  // handlers (so we could fail tests on unhandled errors) and later restore
  // the original ones.
  originalGlobalErrorHandlers?: GlobalErrorHandlers;
  parentProcess: Process | null; // process object from the outer scope
  rootDescribeBlock: DescribeBlock;
  testNamePattern?: RegExp | null;
  testTimeout: number;
  unhandledErrors: Array<Exception>;
  includeTestLocationInResult: boolean;
};

export type DescribeBlock = {
  type: 'describeBlock';
  children: Array<DescribeBlock | TestEntry>;
  hooks: Array<Hook>;
  mode: BlockMode;
  name: BlockName;
  parent?: DescribeBlock;
  /** @deprecated Please get from `children` array instead */
  tests: Array<TestEntry>;
};

export type TestError = Exception | [Exception | undefined, Exception]; // the error from the test, as well as a backup error for async

export type TestEntry = {
  type: 'test';
  asyncError: Exception; // Used if the test failure contains no usable stack trace
  errors: Array<TestError>;
  fn: TestFn;
  invocations: number;
  mode: TestMode;
  name: TestName;
  parent: DescribeBlock;
  startedAt?: number | null;
  duration?: number | null;
  seenDone: boolean;
  status?: TestStatus | null; // whether the test has been skipped or run already
  timeout?: number;
};
