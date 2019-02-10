/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

jest.mock('../');
const importedFn = require('../');
const mockFn = jest.fn(importedFn);

test('first test', () => {
  // mockFn explicitly not called to test error output
  expect(mockFn).toHaveBeenCalledTimes(1);
});
