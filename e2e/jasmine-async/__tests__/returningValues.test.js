/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

describe('returning values', () => {
  [
    1,
    'string',
    0.1,
    null,
    NaN,
    Infinity,
    true,
    false,
    [1],
    {},
    () => {},
  ].forEach(val => {
    it(`throws if '${val}:${typeof val}' is returned`, () => val);
  });
});
