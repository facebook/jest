/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('provides `require.main` set to test suite module', () => {
  const {stderr, stdout} = runJest('require-main');
  expect(stdout).not.toMatch('No tests found');
  expect(stderr).toMatch(/PASS __tests__(\/|\\+)loader\.test\.js/);
});
