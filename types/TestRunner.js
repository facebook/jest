/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Context} from './Context';
import type {Environment} from 'types/Environment';
import type {GlobalConfig, Path, ProjectConfig} from './Config';
import type {ReporterOnStartOptions} from 'types/Reporters';
import type {
  AggregatedResult,
  SerializableError,
  TestResult,
} from 'types/TestResult';
import type Runtime from 'jest-runtime';
import type {TestWatcher as _TestWatcher} from 'jest-cli';

export type Test = {|
  context: Context,
  duration: ?number,
  path: Path,
|};

export type TestWatcher = _TestWatcher;

export type OnTestStart = Test => Promise<void>;
export type OnTestFailure = (Test, SerializableError) => Promise<*>;
export type OnTestSuccess = (Test, TestResult) => Promise<*>;

export type Reporter = {
  +onTestResult: (
    test: Test,
    testResult: TestResult,
    aggregatedResult: AggregatedResult,
  ) => ?Promise<void>,
  +onRunStart: (
    results: AggregatedResult,
    options: ReporterOnStartOptions,
  ) => ?Promise<void>,
  +onTestStart: (test: Test) => ?Promise<void>,
  +onRunComplete: (
    contexts: Set<Context>,
    results: AggregatedResult,
  ) => ?Promise<void>,
  +getLastError: () => ?Error,
};

export type TestFramework = (
  globalConfig: GlobalConfig,
  config: ProjectConfig,
  environment: Environment,
  runtime: Runtime,
  testPath: string,
) => Promise<TestResult>;

export type TestRunnerOptions = {
  serial: boolean,
};

export type TestRunnerContext = {
  changedFiles?: Set<Path>,
};

export type TestRunData = Array<{
  context: Context,
  matches: {allTests: number, tests: Array<Test>, total: number},
}>;
