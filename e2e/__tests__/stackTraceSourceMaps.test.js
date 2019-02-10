/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import {run} from '../Utils';
import runJest from '../runJest';

it('processes stack traces and code frames with source maps', () => {
  const dir = path.resolve(__dirname, '../stack-trace-source-maps');
  run('yarn', dir);
  const {stderr} = runJest(dir, ['--no-cache']);
  expect(stderr).toMatch('> 14 |   (() => expect(false).toBe(true))();');
  expect(stderr).toMatch(`at __tests__/fails.ts:14:24
      at Object.<anonymous> (__tests__/fails.ts:14:35)`);
});
