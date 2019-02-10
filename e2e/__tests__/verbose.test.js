/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('Verbose Reporter', () => {
  const {status, stderr} = runJest('verbose-reporter');

  expect(status).toBe(1);
  expect(stderr).toMatch('works just fine');
  expect(stderr).toMatch('does not work');
  expect(stderr).toMatch(/Verbose\n.*?works/);
});
