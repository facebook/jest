/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const phrase = require('../common-file');

test('A', () => {
  expect(phrase).toBe('hello');
});
