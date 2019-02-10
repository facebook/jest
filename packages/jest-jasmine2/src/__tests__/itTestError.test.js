/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

describe('test/it error throwing', () => {
  it(`it throws error with missing callback function`, () => {
    expect(() => {
      it('test1');
    }).toThrowError(
      'Missing second argument. It must be a callback function. Perhaps you want to use `test.todo` for a test placeholder.',
    );
  });
  it(`it throws an error when first argument isn't a string`, () => {
    expect(() => {
      it(() => {});
    }).toThrowError(`Invalid first argument, () => {}. It must be a string.`);
  });
  it('it throws an error when callback function is not a function', () => {
    expect(() => {
      it('test3', 'test3b');
    }).toThrowError(
      'Invalid second argument, test3b. It must be a callback function.',
    );
  });
  test(`test throws error with missing callback function`, () => {
    expect(() => {
      test('test4');
    }).toThrowError(
      'Missing second argument. It must be a callback function. Perhaps you want to use `test.todo` for a test placeholder.',
    );
  });
  test(`test throws an error when first argument isn't a string`, () => {
    expect(() => {
      test(() => {});
    }).toThrowError(`Invalid first argument, () => {}. It must be a string.`);
  });
  test('test throws an error when callback function is not a function', () => {
    expect(() => {
      test('test6', 'test6b');
    }).toThrowError(
      'Invalid second argument, test6b. It must be a callback function.',
    );
  });
});
