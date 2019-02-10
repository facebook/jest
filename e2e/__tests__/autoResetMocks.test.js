/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('suite with auto-reset', () => {
  const result = runJest('auto-reset-mocks/with-auto-reset');
  expect(result.status).toBe(0);
});

test('suite without auto-reset', () => {
  const result = runJest('auto-reset-mocks/without-auto-reset');
  expect(result.status).toBe(0);
});
