/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Circus, Global} from '@jest/types';
import {bind as bindEach} from 'jest-each';
import {ErrorWithStack, isPromise} from 'jest-util';
import {dispatchSync} from './state';

export {
  setState,
  getState,
  resetState,
  addEventHandler,
  removeEventHandler,
} from './state';
export {default as run} from './run';

type THook = (fn: Circus.HookFn, timeout?: number) => void;
type DescribeFn = (
  blockName: Circus.BlockName,
  blockFn: Circus.BlockFn,
) => void;

const describe = (() => {
  const describe = (blockName: Circus.BlockName, blockFn: Circus.BlockFn) =>
    _dispatchDescribe(blockFn, blockName, describe);
  const only = (blockName: Circus.BlockName, blockFn: Circus.BlockFn) =>
    _dispatchDescribe(blockFn, blockName, only, 'only');
  const skip = (blockName: Circus.BlockName, blockFn: Circus.BlockFn) =>
    _dispatchDescribe(blockFn, blockName, skip, 'skip');

  describe.each = bindEach(describe, false);

  only.each = bindEach(only, false);
  skip.each = bindEach(skip, false);

  describe.only = only;
  describe.skip = skip;

  return describe;
})();

const _dispatchDescribe = (
  blockFn: Circus.BlockFn,
  blockName: Circus.BlockName,
  describeFn: DescribeFn,
  mode?: Circus.BlockMode,
) => {
  const asyncError = new ErrorWithStack(undefined, describeFn);
  if (blockFn === undefined) {
    asyncError.message = `Missing second argument. It must be a callback function.`;
    throw asyncError;
  }
  if (typeof blockFn !== 'function') {
    asyncError.message = `Invalid second argument, ${blockFn}. It must be a callback function.`;
    throw asyncError;
  }
  dispatchSync({
    asyncError,
    blockName,
    mode,
    name: 'start_describe_definition',
  });
  const describeReturn = blockFn();

  if (isPromise(describeReturn)) {
    throw new ErrorWithStack(
      'Returning a Promise from "describe" is not supported. Tests must be defined synchronously.',
      describeFn,
    );
  } else if (describeReturn !== undefined) {
    throw new ErrorWithStack(
      'A "describe" callback must not return a value.',
      describeFn,
    );
  }

  dispatchSync({blockName, mode, name: 'finish_describe_definition'});
};

const _addHook = (
  fn: Circus.HookFn,
  hookType: Circus.HookType,
  hookFn: THook,
  timeout?: number,
) => {
  const asyncError = new ErrorWithStack(undefined, hookFn);

  if (typeof fn !== 'function') {
    asyncError.message =
      'Invalid first argument. It must be a callback function.';

    throw asyncError;
  }

  dispatchSync({asyncError, fn, hookType, name: 'add_hook', timeout});
};

// Hooks have to pass themselves to the HOF in order for us to trim stack traces.
const beforeEach: THook = (fn, timeout) =>
  _addHook(fn, 'beforeEach', beforeEach, timeout);
const beforeAll: THook = (fn, timeout) =>
  _addHook(fn, 'beforeAll', beforeAll, timeout);
const afterEach: THook = (fn, timeout) =>
  _addHook(fn, 'afterEach', afterEach, timeout);
const afterAll: THook = (fn, timeout) =>
  _addHook(fn, 'afterAll', afterAll, timeout);

const test: Global.It = (() => {
  const test = (
    testName: Circus.TestName,
    fn: Circus.TestFn,
    timeout?: number,
  ): void => _addTest(testName, undefined, fn, test, timeout);
  const skip = (
    testName: Circus.TestName,
    fn?: Circus.TestFn,
    timeout?: number,
  ): void => _addTest(testName, 'skip', fn, skip, timeout);
  const only = (
    testName: Circus.TestName,
    fn: Circus.TestFn,
    timeout?: number,
  ): void => _addTest(testName, 'only', fn, test.only, timeout);

  test.todo = (testName: Circus.TestName, ...rest: Array<any>): void => {
    if (rest.length > 0 || typeof testName !== 'string') {
      throw new ErrorWithStack(
        'Todo must be called with only a description.',
        test.todo,
      );
    }
    return _addTest(testName, 'todo', () => {}, test.todo);
  };

  const _addTest = (
    testName: Circus.TestName,
    mode: Circus.TestMode,
    fn: Circus.TestFn | undefined,
    testFn: (
      testName: Circus.TestName,
      fn: Circus.TestFn,
      timeout?: number,
    ) => void,
    timeout?: number,
  ) => {
    const asyncError = new ErrorWithStack(undefined, testFn);

    if (typeof testName !== 'string') {
      asyncError.message = `Invalid first argument, ${testName}. It must be a string.`;

      throw asyncError;
    }
    if (fn === undefined) {
      asyncError.message =
        'Missing second argument. It must be a callback function. Perhaps you want to use `test.todo` for a test placeholder.';

      throw asyncError;
    }
    if (typeof fn !== 'function') {
      asyncError.message = `Invalid second argument, ${fn}. It must be a callback function.`;

      throw asyncError;
    }

    return dispatchSync({
      asyncError,
      fn,
      mode,
      name: 'add_test',
      testName,
      timeout,
    });
  };

  test.each = bindEach(test);
  only.each = bindEach(only);
  skip.each = bindEach(skip);

  test.only = only;
  test.skip = skip;

  return test;
})();

const it: Global.It = test;

export type Event = Circus.Event;
export type State = Circus.State;
export {afterAll, afterEach, beforeAll, beforeEach, describe, it, test};
export default {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
  test,
};
