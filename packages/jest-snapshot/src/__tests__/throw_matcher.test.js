/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

const {toThrowErrorMatchingSnapshot} = require('../');

let matchFn;

beforeEach(() => {
  matchFn = jest.fn(() => ({
    actual: 'coconut',
    expected: 'coconut',
  }));
});

it('throw matcher can take func', () => {
  const throwMatcher = toThrowErrorMatchingSnapshot.bind({
    snapshotState: {match: matchFn},
  });

  throwMatcher(() => {
    throw new Error('coconut');
  });

  expect(matchFn).toHaveBeenCalledWith(
    expect.objectContaining({received: 'coconut', testName: ''}),
  );
});

describe('throw matcher from promise', () => {
  let throwMatcher;

  beforeEach(() => {
    throwMatcher = toThrowErrorMatchingSnapshot.bind({
      snapshotState: {match: matchFn},
    });
  });

  it('can take error', () => {
    throwMatcher(new Error('coconut'), 'testName', true);

    expect(matchFn).toHaveBeenCalledWith(
      expect.objectContaining({received: 'coconut', testName: ''}),
    );
  });

  it('can take custom error', () => {
    class CustomError extends Error {}

    throwMatcher(new CustomError('coconut'), 'testName', true);

    expect(matchFn).toHaveBeenCalledWith(
      expect.objectContaining({received: 'coconut', testName: ''}),
    );
  });
});
