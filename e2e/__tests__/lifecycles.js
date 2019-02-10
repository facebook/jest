/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('suite with invalid assertions in afterAll', () => {
  const {stderr, status} = runJest('lifecycles');
  expect(stderr).toMatch(/afterAll just failed!/);
  expect(status).toBe(1);
});
