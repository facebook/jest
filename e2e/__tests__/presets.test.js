/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('supports json preset', () => {
  const result = runJest('presets/json');
  expect(result.status).toBe(0);
});

test('supports js preset', () => {
  const result = runJest('presets/js');
  expect(result.status).toBe(0);
});
