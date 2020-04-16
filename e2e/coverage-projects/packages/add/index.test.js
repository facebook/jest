/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const add = require('.');

describe('add', () => {
  it('should add correctly', () => {
    expect(add(2, 3)).toBe(5);
  });
});
