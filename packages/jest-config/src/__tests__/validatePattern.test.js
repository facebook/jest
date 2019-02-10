/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import validatePattern from '../validatePattern';

describe('validate pattern function', () => {
  it('without passed args returns true', () => {
    const isValid = validatePattern();

    expect(isValid).toBeTruthy();
  });

  it('returns true for empty pattern', () => {
    const isValid = validatePattern('');

    expect(isValid).toBeTruthy();
  });

  it('returns true for valid pattern', () => {
    const isValid = validatePattern('abc+');

    expect(isValid).toBeTruthy();
  });

  it('returns false for invalid pattern', () => {
    const isValid = validatePattern('\\');

    expect(isValid).toBeFalsy();
  });
});
