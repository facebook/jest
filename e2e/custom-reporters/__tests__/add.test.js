/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const add = require('../add');

describe('Custom Reporters', () => {
  test('adds ok', () => {
    expect(add(1, 2)).toBe(3);
    expect(add(3, 4)).toBe(7);
    expect(add(12, 24)).toBe(36);
  });
});
