/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const sum = require('../sum');

it('no ancestors', () => {
  expect(true).toBeTruthy();
});

describe('sum', () => {
  it('adds numbers', () => {
    expect(sum(1, 2)).toEqual(3);
  });

  describe('failing tests', () => {
    it('fails the test', () => {
      expect(sum(1, 2)).toEqual(4);
    });
  });
});
