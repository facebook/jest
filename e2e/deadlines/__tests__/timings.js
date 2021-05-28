/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fileStarted = Date.now();

describe('describe', () => {
  jest.setTimeout(789);

  it('is present for global timeout', () => {
    const testStarted = Date.now();
    const deadline = expect.deadline();
    expect(deadline).toBeGreaterThanOrEqual(testStarted);
    expect(deadline).toBeLessThanOrEqual(testStarted + 789);
  });

  it('explicit override', () => {
    const testStarted = Date.now();
    const deadline = expect.deadline();
    expect(deadline).toBeGreaterThanOrEqual(testStarted);
    expect(deadline).toBeLessThanOrEqual(testStarted + 456);
  }, 456);
});
