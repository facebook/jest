/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('resolve node module', () => {
  const result = runJest('resolve-node-module');
  expect(result.status).toBe(0);
});
