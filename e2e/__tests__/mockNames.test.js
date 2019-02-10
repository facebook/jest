/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('suite without mock name, mock called', () => {
  const {stderr, status} = runJest('mock-names/without-mock-name');

  expect(status).toBe(0);
  expect(stderr).toMatch(/PASS/);
});

test('suite without mock name, mock not called', () => {
  const {stderr, status} = runJest('mock-names/without-mock-name-not-called');

  expect(status).toBe(1);
  expect(stderr).toMatch(/expect\(jest\.fn\(\)\)\.toHaveBeenCalled/);
});

test('suite with mock name, expect mock not called', () => {
  const {stderr, status} = runJest('mock-names/with-mock-name-not-called-pass');

  expect(status).toBe(0);
  expect(stderr).toMatch(/PASS/);
});

test('suite with mock name, mock called, expect fail', () => {
  const {stderr, status} = runJest('mock-names/with-mock-name-not-called-fail');

  expect(status).toBe(1);
  expect(stderr).toMatch(/expect\(myMockedFunction\)\.not\.toHaveBeenCalled/);
});

test('suite with mock name, mock called 5 times', () => {
  const {stderr, status} = runJest('mock-names/with-mock-name-call-times-pass');

  expect(status).toBe(0);
  expect(stderr).toMatch(/PASS/);
});

test('suite with mock name, mock not called 5 times, expect fail', () => {
  const {stderr, status} = runJest('mock-names/with-mock-name-call-times-fail');

  expect(status).toBe(1);
  expect(stderr).toMatch(/expect\(myMockedFunction\)\.toHaveBeenCalledTimes/);
});

test('suite with mock name, mock called', () => {
  const {stderr, status} = runJest('mock-names/with-mock-name');

  expect(status).toBe(0);
  expect(stderr).toMatch(/PASS/);
});

test('suite with mock name, mock not called', () => {
  const {stderr, status} = runJest('mock-names/with-mock-name-not-called');

  expect(status).toBe(1);
  expect(stderr).toMatch(/expect\(myMockedFunction\)\.toHaveBeenCalled/);
});
