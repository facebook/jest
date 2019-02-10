/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-disable jest/no-focused-tests */

export function isJestCircusRun() {
  return process.env.JEST_CIRCUS === '1';
}

export function skipSuiteOnJasmine() {
  if (!isJestCircusRun()) {
    test.only('does not work on Jasmine', () => {
      console.warn('[SKIP] Does not work on Jasmine');
    });
  }
}

export function skipSuiteOnJestCircus() {
  if (isJestCircusRun()) {
    test.only('does not work on jest-circus', () => {
      console.warn('[SKIP] Does not work on jest-circus');
    });
  }
}

export function skipSuiteOnWindows() {
  if (process.platform === 'win32') {
    test.only('does not work on Windows', () => {
      console.warn('[SKIP] Does not work on Windows');
    });
  }
}
