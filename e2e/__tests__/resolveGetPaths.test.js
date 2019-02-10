/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('require.resolve.paths', () => {
  const {status} = runJest('resolve-get-paths');
  expect(status).toBe(0);
});
