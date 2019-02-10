/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import runJest from '../runJest';

const dir = path.resolve(__dirname, '../deprecated-cli-options');

it('Prints deprecation warnings for CLI flags', () => {
  const {stderr, status} = runJest(dir, ['--mapCoverage']);
  expect(status).toBe(0);
  expect(stderr).toMatch(/Test Suites: 1 passed, 1 total/);
  expect(stderr).toMatch(`● Deprecation Warning:

  Option "mapCoverage" has been removed, as it's no longer necessary.

  Please update your configuration.

  CLI Options Documentation:
  https://jestjs.io/docs/en/cli.html`);
});
