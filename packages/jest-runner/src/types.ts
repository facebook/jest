/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {EventEmitter} from 'events';
import {Config} from '@jest/types';
import {SerializableError, TestResult} from '@jest/test-result';
import {JestEnvironment} from '@jest/environment';
import {FS as HasteFS, ModuleMap} from 'jest-haste-map';
import HasteResolver = require('jest-resolve');
import Runtime = require('jest-runtime');

export type ErrorWithCode = Error & {code?: string};
export type Test = {
  context: Context;
  duration?: number;
  path: Config.Path;
};

export type Context = {
  config: Config.ProjectConfig;
  hasteFS: HasteFS;
  moduleMap: ModuleMap;
  resolver: HasteResolver;
};

export type OnTestStart = (test: Test) => Promise<void>;
export type OnTestFailure = (
  test: Test,
  serializableError: SerializableError,
) => Promise<void>;
export type OnTestSuccess = (
  test: Test,
  testResult: TestResult,
) => Promise<void>;

export type TestFramework = (
  globalConfig: Config.GlobalConfig,
  config: Config.ProjectConfig,
  environment: JestEnvironment,
  runtime: Runtime,
  testPath: string,
  sendMessageToJest?: Function,
) => Promise<TestResult>;

export type TestRunnerOptions = {
  serial: boolean;
};

export type TestRunnerContext = {
  changedFiles?: Set<Config.Path>;
};

export type TestRunnerSerializedContext = {
  changedFiles?: Array<Config.Path>;
};

// TODO: Should live in `@jest/core` or `jest-watcher`
export type WatcherState = {
  interrupted: boolean;
};
export interface TestWatcher extends EventEmitter {
  state: WatcherState;
  new ({isWatchMode}: {isWatchMode: boolean}): TestWatcher;
  setState(state: WatcherState): void;
  isInterrupted(): boolean;
  isWatchMode(): boolean;
}
