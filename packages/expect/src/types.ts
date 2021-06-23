/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable local/ban-types-eventually */

import type {Config} from '@jest/types';
import type * as jestMatcherUtils from 'jest-matcher-utils';
import {INTERNAL_MATCHER_FLAG} from './jestMatchersObject';

export type SyncExpectationResult = {
  pass: boolean;
  message: () => string;
};

export type AsyncExpectationResult = Promise<SyncExpectationResult>;

export type ExpectationResult = SyncExpectationResult | AsyncExpectationResult;

export type RawMatcherFn = {
  (received: any, expected: any, options?: any): ExpectationResult;
  [INTERNAL_MATCHER_FLAG]?: boolean;
};

export type ThrowingMatcherFn = (actual: any) => void;
export type PromiseMatcherFn = (actual: any) => Promise<void>;

export type Tester = (a: any, b: any) => boolean | undefined;

export type MatcherState = {
  assertionCalls: number;
  currentTestName?: string;
  dontThrow?: () => void;
  error?: Error;
  equals: (
    a: unknown,
    b: unknown,
    customTesters?: Array<Tester>,
    strictCheck?: boolean,
  ) => boolean;
  expand?: boolean;
  expectedAssertionsNumber?: number | null;
  expectedAssertionsNumberError?: Error;
  isExpectingAssertions?: boolean;
  isExpectingAssertionsError?: Error;
  isNot: boolean;
  promise: string;
  suppressedErrors: Array<Error>;
  testPath?: Config.Path;
  utils: typeof jestMatcherUtils & {
    iterableEquality: Tester;
    subsetEquality: Tester;
  };
};

export type AsymmetricMatcher = Record<string, any>;
export type MatchersObject = {[id: string]: RawMatcherFn};
export type ExpectedAssertionsErrors = Array<{
  actual: string | number;
  error: Error;
  expected: string;
}>;
export type Expect = {
  <T = unknown>(actual: T): Matchers<T>;
  // TODO: this is added by test runners, not `expect` itself
  addSnapshotSerializer(arg0: any): void;
  assertions(arg0: number): void;
  extend(arg0: any): void;
  extractExpectedAssertionsErrors: () => ExpectedAssertionsErrors;
  getState(): MatcherState;
  hasAssertions(): void;
  setState(state: Partial<MatcherState>): void;

  any(expectedObject: any): AsymmetricMatcher;
  anything(): AsymmetricMatcher;
  arrayContaining(sample: Array<unknown>): AsymmetricMatcher;
  objectContaining(sample: Record<string, unknown>): AsymmetricMatcher;
  stringContaining(expected: string): AsymmetricMatcher;
  stringMatching(expected: string | RegExp): AsymmetricMatcher;
  [id: string]: AsymmetricMatcher;
  not: {[id: string]: AsymmetricMatcher};
};

interface Constructable {
  new (...args: Array<unknown>): unknown;
}

// This is a copy from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/de6730f4463cba69904698035fafd906a72b9664/types/jest/index.d.ts#L570-L817
export interface Matchers<R> {
  /**
   * Ensures the last call to a mock function was provided specific args.
   */
  lastCalledWith(...args: Array<unknown>): R;
  /**
   * Ensure that the last call to a mock function has returned a specified value.
   */
  lastReturnedWith(value: unknown): R;
  /**
   * If you know how to test something, `.not` lets you test its opposite.
   */
  not: Matchers<R>;
  /**
   * Ensure that a mock function is called with specific arguments on an Nth call.
   */
  nthCalledWith(nthCall: number, ...args: Array<unknown>): R;
  /**
   * Ensure that the nth call to a mock function has returned a specified value.
   */
  nthReturnedWith(n: number, value: unknown): R;
  /**
   * Use resolves to unwrap the value of a fulfilled promise so any other
   * matcher can be chained. If the promise is rejected the assertion fails.
   */
  resolves: Matchers<Promise<R>>;
  /**
   * Unwraps the reason of a rejected promise so any other matcher can be chained.
   * If the promise is fulfilled the assertion fails.
   */
  rejects: Matchers<Promise<R>>;
  /**
   * Checks that a value is what you expect. It uses `===` to check strict equality.
   * Don't use `toBe` with floating-point numbers.
   */
  toBe(expected: unknown): R;
  /**
   * Ensures that a mock function is called.
   */
  toBeCalled(): R;
  /**
   * Ensures that a mock function is called an exact number of times.
   */
  toBeCalledTimes(expected: number): R;
  /**
   * Ensure that a mock function is called with specific arguments.
   */
  toBeCalledWith(...args: Array<unknown>): R;
  /**
   * Using exact equality with floating point numbers is a bad idea.
   * Rounding means that intuitive things fail.
   * The default for numDigits is 2.
   */
  toBeCloseTo(expected: number, numDigits?: number): R;
  /**
   * Ensure that a variable is not undefined.
   */
  toBeDefined(): R;
  /**
   * When you don't care what a value is, you just want to
   * ensure a value is false in a boolean context.
   */
  toBeFalsy(): R;
  /**
   * For comparing floating point numbers.
   */
  toBeGreaterThan(expected: number | bigint): R;
  /**
   * For comparing floating point numbers.
   */
  toBeGreaterThanOrEqual(expected: number | bigint): R;
  /**
   * Ensure that an object is an instance of a class.
   * This matcher uses `instanceof` underneath.
   */
  toBeInstanceOf(expected: Function): R;
  /**
   * For comparing floating point numbers.
   */
  toBeLessThan(expected: number | bigint): R;
  /**
   * For comparing floating point numbers.
   */
  toBeLessThanOrEqual(expected: number | bigint): R;
  /**
   * This is the same as `.toBe(null)` but the error messages are a bit nicer.
   * So use `.toBeNull()` when you want to check that something is null.
   */
  toBeNull(): R;
  /**
   * Use when you don't care what a value is, you just want to ensure a value
   * is true in a boolean context. In JavaScript, there are six falsy values:
   * `false`, `0`, `''`, `null`, `undefined`, and `NaN`. Everything else is truthy.
   */
  toBeTruthy(): R;
  /**
   * Used to check that a variable is undefined.
   */
  toBeUndefined(): R;
  /**
   * Used to check that a variable is NaN.
   */
  toBeNaN(): R;
  /**
   * Used when you want to check that an item is in a list.
   * For testing the items in the list, this uses `===`, a strict equality check.
   */
  toContain(expected: unknown): R;
  /**
   * Used when you want to check that an item is in a list.
   * For testing the items in the list, this  matcher recursively checks the
   * equality of all fields, rather than checking for object identity.
   */
  toContainEqual(expected: unknown): R;
  /**
   * Used when you want to check that two objects have the same value.
   * This matcher recursively checks the equality of all fields, rather than checking for object identity.
   */
  toEqual(expected: unknown): R;
  /**
   * Ensures that a mock function is called.
   */
  toHaveBeenCalled(): R;
  /**
   * Ensures that a mock function is called an exact number of times.
   */
  toHaveBeenCalledTimes(expected: number): R;
  /**
   * Ensure that a mock function is called with specific arguments.
   */
  toHaveBeenCalledWith(...args: Array<unknown>): R;
  /**
   * Ensure that a mock function is called with specific arguments on an Nth call.
   */
  toHaveBeenNthCalledWith(nthCall: number, ...args: Array<unknown>): R;
  /**
   * If you have a mock function, you can use `.toHaveBeenLastCalledWith`
   * to test what arguments it was last called with.
   */
  toHaveBeenLastCalledWith(...args: Array<unknown>): R;
  /**
   * Use to test the specific value that a mock function last returned.
   * If the last call to the mock function threw an error, then this matcher will fail
   * no matter what value you provided as the expected return value.
   */
  toHaveLastReturnedWith(expected: unknown): R;
  /**
   * Used to check that an object has a `.length` property
   * and it is set to a certain numeric value.
   */
  toHaveLength(expected: number): R;
  /**
   * Use to test the specific value that a mock function returned for the nth call.
   * If the nth call to the mock function threw an error, then this matcher will fail
   * no matter what value you provided as the expected return value.
   */
  toHaveNthReturnedWith(nthCall: number, expected: unknown): R;
  /**
   * Use to check if property at provided reference keyPath exists for an object.
   * For checking deeply nested properties in an object you may use dot notation or an array containing
   * the keyPath for deep references.
   *
   * Optionally, you can provide a value to check if it's equal to the value present at keyPath
   * on the target object. This matcher uses 'deep equality' (like `toEqual()`) and recursively checks
   * the equality of all fields.
   *
   * @example
   *
   * expect(houseForSale).toHaveProperty('kitchen.area', 20);
   */
  toHaveProperty(keyPath: string | Array<string>, value?: unknown): R;
  /**
   * Use to test that the mock function successfully returned (i.e., did not throw an error) at least one time
   */
  toHaveReturned(): R;
  /**
   * Use to ensure that a mock function returned successfully (i.e., did not throw an error) an exact number of times.
   * Any calls to the mock function that throw an error are not counted toward the number of times the function returned.
   */
  toHaveReturnedTimes(expected: number): R;
  /**
   * Use to ensure that a mock function returned a specific value.
   */
  toHaveReturnedWith(expected: unknown): R;
  /**
   * Check that a string matches a regular expression.
   */
  toMatch(expected: string | RegExp): R;
  /**
   * Used to check that a JavaScript object matches a subset of the properties of an object
   */
  toMatchObject(expected: Record<string, unknown> | Array<unknown>): R;
  /**
   * Ensure that a mock function has returned (as opposed to thrown) at least once.
   */
  toReturn(): R;
  /**
   * Ensure that a mock function has returned (as opposed to thrown) a specified number of times.
   */
  toReturnTimes(count: number): R;
  /**
   * Ensure that a mock function has returned a specified value at least once.
   */
  toReturnWith(value: unknown): R;
  /**
   * Use to test that objects have the same types as well as structure.
   */
  toStrictEqual(expected: unknown): R;
  /**
   * Used to test that a function throws when it is called.
   */
  toThrow(error?: string | Constructable | RegExp | Error): R;
  /**
   * If you want to test that a specific error is thrown inside a function.
   */
  toThrowError(error?: string | Constructable | RegExp | Error): R;

  /* TODO: START snapshot matchers are not from `expect`, the types should not be here */
  /**
   * This ensures that a value matches the most recent snapshot with property matchers.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchSnapshot<T extends {[P in keyof R]: unknown}>(
    propertyMatchers: Partial<T>,
    snapshotName?: string,
  ): R;
  /**
   * This ensures that a value matches the most recent snapshot.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchSnapshot(snapshotName?: string): R;
  /**
   * This ensures that a value matches the most recent snapshot.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchNamedSnapshot<T extends {[P in keyof R]: unknown}>(
    propertyMatchers: Partial<T>,
    snapshot?: string,
  ): R;
  /**
   * This ensures that a value matches the most recent snapshot.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchNamedSnapshot(snapshotName?: string): R;
  /**
   * This ensures that a value matches the most recent snapshot with property matchers.
   * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchInlineSnapshot<T extends {[P in keyof R]: unknown}>(
    propertyMatchers: Partial<T>,
    snapshot?: string,
  ): R;
  /**
   * This ensures that a value matches the most recent snapshot with property matchers.
   * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchInlineSnapshot(snapshot?: string): R;
  /**
   * Used to test that a function throws a error matching the most recent snapshot when it is called.
   */
  toThrowErrorMatchingSnapshot(): R;
  /**
   * Used to test that a function throws a error matching the most recent snapshot when it is called.
   * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
   */
  toThrowErrorMatchingInlineSnapshot(snapshot?: string): R;
  /* TODO: END snapshot matchers are not from `expect`, the types should not be here */
}
