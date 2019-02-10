/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import os from 'os';
import {cleanup, writeFiles} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(os.tmpdir(), 'test-failure-exit-code-test');

beforeEach(() => cleanup(DIR));
afterAll(() => cleanup(DIR));

test('exits with a specified code when test fail', () => {
  writeFiles(DIR, {
    '__tests__/test.test.js': `test('test', () => { expect(1).toBe(2); });`,
    'package.json': JSON.stringify({
      jest: {testEnvironment: 'node', testFailureExitCode: 99},
    }),
  });

  let {status} = runJest(DIR);
  expect(status).toBe(99);

  ({status} = runJest(DIR, ['--testFailureExitCode', '77']));
  expect(status).toBe(77);

  writeFiles(DIR, {
    '__tests__/test.test.js': `test('test', () => { expect(1).toBe(2); });`,
    'package.json': JSON.stringify({
      jest: {testEnvironment: 'node'},
    }),
  });
  ({status} = runJest(DIR));
  expect(status).toBe(1);
});
