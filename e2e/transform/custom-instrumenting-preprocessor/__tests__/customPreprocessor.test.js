/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

require('../src');

it('instruments by setting global.__INSTRUMENTED__', () => {
  expect(global.__INSTRUMENTED__).toBe(true);
});

it('preprocesses by setting global.__PREPROCESSED__', () => {
  expect(global.__PREPROCESSED__).toBe(true);
});
