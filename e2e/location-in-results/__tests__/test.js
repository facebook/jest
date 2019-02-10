/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// This file is missing 'use strict' to force babel into doing something
// as we have `transform-strict-mode`

/* eslint jest/no-focused-tests: 0 */

it('it no ancestors', () => {
  expect(true).toBeTruthy();
});

xit('xit no ancestors', () => {
  expect(true).toBeTruthy();
});

fit('fit no ancestors', () => {
  expect(true).toBeTruthy();
});

describe('nested', () => {
  it('it nested', () => {
    expect(true).toBeTruthy();
  });

  xit('xit nested', () => {
    expect(true).toBeTruthy();
  });

  fit('fit nested', () => {
    expect(true).toBeTruthy();
  });
});
