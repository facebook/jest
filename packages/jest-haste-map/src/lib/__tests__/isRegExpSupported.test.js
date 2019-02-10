/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import isRegExpSupported from '../isRegExpSupported';

describe('isRegExpSupported', () => {
  it('should return true when passing valid regular expression', () => {
    expect(isRegExpSupported('(?:foo|bar)')).toBe(true);
  });

  it('should return false when passing an invalid regular expression', () => {
    expect(isRegExpSupported('(?_foo|bar)')).toBe(false);
  });
});
