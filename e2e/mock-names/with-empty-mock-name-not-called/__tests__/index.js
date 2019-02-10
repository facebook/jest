/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

jest.mock('../');
const importedFn = require('../');
// empty mock name should result in default 'jest.fn()' output
const mockFn = jest.fn(importedFn).mockName('');

test('first test', () => {
  // mockFn explicitly not called to test error output
  expect(mockFn).toHaveBeenCalledTimes(1);
});
