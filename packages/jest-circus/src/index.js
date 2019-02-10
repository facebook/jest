/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  BlockFn,
  HookFn,
  HookType,
  TestFn,
  BlockMode,
  BlockName,
  TestName,
  TestMode,
} from 'types/Circus';
import {bind as bindEach} from 'jest-each';
// $FlowFixMe: Converted to TS
import {ErrorWithStack} from 'jest-util';
import {dispatch} from './state';

type THook = (fn: HookFn, timeout?: number) => void;

const describe = (blockName: BlockName, blockFn: BlockFn) =>
  _dispatchDescribe(blockFn, blockName, describe);
describe.only = (blockName: BlockName, blockFn: BlockFn) =>
  _dispatchDescribe(blockFn, blockName, describe.only, 'only');
describe.skip = (blockName: BlockName, blockFn: BlockFn) =>
  _dispatchDescribe(blockFn, blockName, describe.skip, 'skip');

const _dispatchDescribe = (
  blockFn,
  blockName,
  describeFn,
  mode?: BlockMode,
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
  dispatch({
    asyncError,
    blockName,
    mode,
    name: 'start_describe_definition',
  });
  blockFn();
  dispatch({blockName, mode, name: 'finish_describe_definition'});
};

const _addHook = (fn: HookFn, hookType: HookType, hookFn, timeout: ?number) => {
  const asyncError = new ErrorWithStack(undefined, hookFn);

  if (typeof fn !== 'function') {
    asyncError.message =
      'Invalid first argument. It must be a callback function.';

    throw asyncError;
  }

  dispatch({asyncError, fn, hookType, name: 'add_hook', timeout});
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

const test = (testName: TestName, fn: TestFn, timeout?: number) =>
  _addTest(testName, undefined, fn, test, timeout);
const it = test;
test.skip = (testName: TestName, fn?: TestFn, timeout?: number) =>
  _addTest(testName, 'skip', fn, test.skip, timeout);
test.only = (testName: TestName, fn: TestFn, timeout?: number) =>
  _addTest(testName, 'only', fn, test.only, timeout);
test.todo = (testName: TestName, ...rest: Array<mixed>) => {
  if (rest.length > 0 || typeof testName !== 'string') {
    throw new ErrorWithStack(
      'Todo must be called with only a description.',
      test.todo,
    );
  }
  return _addTest(testName, 'todo', () => {}, test.todo);
};

const _addTest = (
  testName: TestName,
  mode: TestMode,
  fn?: TestFn,
  testFn,
  timeout: ?number,
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

  return dispatch({
    asyncError,
    fn,
    mode,
    name: 'add_test',
    testName,
    timeout,
  });
};

test.each = bindEach(test);
test.only.each = bindEach(test.only);
test.skip.each = bindEach(test.skip);

describe.each = bindEach(describe, false);
describe.only.each = bindEach(describe.only, false);
describe.skip.each = bindEach(describe.skip, false);

module.exports = {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
  test,
};
