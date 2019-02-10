/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('mock works with generator', () => {
  const {status} = runJest('generator-mock');

  expect(status).toBe(0);
});
