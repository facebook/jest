/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {AssertionError} from 'assert';
import type {Config} from '@jest/types';
import type expect from 'expect';
import type CallTracker from './jasmine/CallTracker';
import type Env from './jasmine/Env';
import type JsApiReporter from './jasmine/JsApiReporter';
import type ReportDispatcher from './jasmine/ReportDispatcher';
import type {default as Spec, SpecResult} from './jasmine/Spec';
import type SpyStrategy from './jasmine/SpyStrategy';
import type {default as Suite, SuiteResult} from './jasmine/Suite';
import type Timer from './jasmine/Timer';
import type createSpy from './jasmine/createSpy';
import type SpyRegistry from './jasmine/spyRegistry';

export type SpecDefinitionsFn = () => void;

export interface AssertionErrorWithStack extends AssertionError {
  stack: string;
}

// TODO Add expect types to @jest/types or leave it here
// Borrowed from "expect"
// -------START-------
export type SyncExpectationResult = {
  pass: boolean;
  message: () => string;
};

export type AsyncExpectationResult = Promise<SyncExpectationResult>;

export type ExpectationResult = SyncExpectationResult | AsyncExpectationResult;

export type RawMatcherFn = (
  expected: unknown,
  actual: unknown,
  options?: unknown,
) => ExpectationResult;
// -------END-------

export type RunDetails = {
  totalSpecsDefined?: number;
  failedExpectations?: SuiteResult['failedExpectations'];
};

export type Reporter = {
  jasmineDone: (runDetails: RunDetails) => void;
  jasmineStarted: (runDetails: RunDetails) => void;
  specDone: (result: SpecResult) => void;
  specStarted: (spec: SpecResult) => void;
  suiteDone: (result: SuiteResult) => void;
  suiteStarted: (result: SuiteResult) => void;
};

export interface Spy extends Record<string, any> {
  (this: Record<string, unknown>, ...args: Array<any>): unknown;
  and: SpyStrategy;
  calls: CallTracker;
  restoreObjectToOriginalState?: () => void;
}

type JasmineMatcher = {
  (matchersUtil: unknown, context: unknown): JasmineMatcher;
  compare: () => RawMatcherFn;
  negativeCompare: () => RawMatcherFn;
};

export type JasmineMatchersObject = {[id: string]: JasmineMatcher};

export type Jasmine = {
  _DEFAULT_TIMEOUT_INTERVAL: number;
  DEFAULT_TIMEOUT_INTERVAL: number;
  currentEnv_: ReturnType<typeof Env>['prototype'];
  getEnv: () => ReturnType<typeof Env>['prototype'];
  createSpy: typeof createSpy;
  Env: ReturnType<typeof Env>;
  JsApiReporter: typeof JsApiReporter;
  ReportDispatcher: typeof ReportDispatcher;
  Spec: typeof Spec;
  SpyRegistry: typeof SpyRegistry;
  Suite: typeof Suite;
  Timer: typeof Timer;
  version: string;
  testPath: Config.Path;
  addMatchers: (matchers: JasmineMatchersObject) => void;
} & typeof expect &
  NodeJS.Global;

declare global {
  module NodeJS {
    interface Global {
      expect: typeof expect;
    }
  }
}
