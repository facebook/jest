/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('overriding native promise does not freeze Jest', () => {
  const run = runJest('override-globals');
  expect(run.stderr).toMatch(/PASS __tests__(\/|\\)index.js/);
});

test('has a duration even if time is faked', () => {
  const regex = /works well \((\d+)ms\)/;
  const {stderr} = runJest('override-globals', ['--verbose']);

  expect(stderr).toMatch(regex);

  const [, duration] = stderr.match(regex);

  expect(Number(duration)).toBeGreaterThan(0);
});
