/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path} from 'types/Config';
import type {SnapshotState} from 'jest-snapshot';

export type SyncExpectationResult = {
  pass: boolean,
  message: () => string,
};

export type AsyncExpectationResult = Promise<SyncExpectationResult>;

export type ExpectationResult = SyncExpectationResult | AsyncExpectationResult;

export type RawMatcherFn = (
  expected: any,
  actual: any,
  options: any,
) => ExpectationResult;

export type ThrowingMatcherFn = (actual: any) => void;
export type PromiseMatcherFn = (actual: any) => Promise<void>;
export type MatcherState = {
  assertionCalls: number,
  currentTestName?: string,
  error?: Error,
  equals: (any, any, ?Array<any>) => boolean,
  expand?: boolean,
  expectedAssertionsNumber: ?number,
  isExpectingAssertions: ?boolean,
  isNot: boolean,
  promise: string,
  snapshotState: SnapshotState,
  suppressedErrors: Array<Error>,
  testPath?: Path,
  utils: Object,
};

export type AsymmetricMatcher = Object;
export type MatchersObject = {[id: string]: RawMatcherFn};
export type Expect = {
  (expected: any): ExpectationObject,
  addSnapshotSerializer(any): void,
  assertions(number): void,
  extend(any): void,
  extractExpectedAssertionsErrors: () => Array<{
    actual: string | number,
    error: Error,
    expected: string,
  }>,
  getState(): MatcherState,
  hasAssertions(): void,
  setState(Object): void,

  any(expectedObject: any): AsymmetricMatcher,
  anything(): AsymmetricMatcher,
  arrayContaining(sample: Array<any>): AsymmetricMatcher,
  objectContaining(sample: Object): AsymmetricMatcher,
  stringContaining(expected: string): AsymmetricMatcher,
  stringMatching(expected: string | RegExp): AsymmetricMatcher,
  [id: string]: AsymmetricMatcher,
  not: {[id: string]: AsymmetricMatcher},
};

export type ExpectationObject = {
  [id: string]: ThrowingMatcherFn,
  resolves: {
    [id: string]: PromiseMatcherFn,
    not: {[id: string]: PromiseMatcherFn},
  },
  rejects: {
    [id: string]: PromiseMatcherFn,
    not: {[id: string]: PromiseMatcherFn},
  },
  not: {[id: string]: ThrowingMatcherFn},
};

export type MatcherHintOptions = {
  comment?: string,
  isDirectExpectCall?: boolean,
  isNot?: boolean,
  promise?: string,
  secondArgument?: ?string,
};
