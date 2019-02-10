/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {resolve} from 'path';

import {run} from '../Utils';

const dir = resolve(__dirname, '..', 'run-programatically');

test('run Jest programatically', () => {
  const {stdout} = run(`node index.js --version`, dir);
  expect(stdout).toMatch(/\d{2}\.\d{1,2}\.\d{1,2}[\-\S]*-dev$/);
});
