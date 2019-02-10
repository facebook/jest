/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const loader = require('../loader');

test('loader should load a module', () => {
  expect(loader('../example.js')).toBeTruthy();
});
