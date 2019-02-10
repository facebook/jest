/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const add = require('../add');

describe('CustomReporters', () => {
  test('adds fail', () => {
    expect(add(1, 3)).toBe(231);
    expect(add(5, 7)).toBe(120);
    expect(add(2, 4)).toBe(6);
  });
});
