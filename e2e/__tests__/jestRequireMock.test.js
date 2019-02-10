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

const DIR = path.resolve(os.tmpdir(), 'jest-require-mock-test');

beforeEach(() => cleanup(DIR));
afterAll(() => cleanup(DIR));

test('understands dependencies using jest.requireMock', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '__tests__/a.test.js': `
      const a = jest.requireMock('../a');

      test('a', () => {});
    `,
    '__tests__/b.test.js': `test('b', () => {});`,
    'a.js': `module.exports = {}`,
    'package.json': JSON.stringify({jest: {}}),
  });

  let stdout;
  let stderr;
  ({stdout, stderr} = runJest(DIR, ['--findRelatedTests', 'a.js']));

  expect(stdout).not.toMatch('No tests found');
  expect(stderr).toMatch('PASS __tests__/a.test.js');
  expect(stderr).not.toMatch('PASS __tests__/b.test.js');

  // change to jest.requireMock
  writeFiles(DIR, {
    '__tests__/a.test.js': `
      const a = jest.requireMock('../a');

      test('a', () => {});
    `,
  });

  ({stderr, stdout} = runJest(DIR, ['--findRelatedTests', 'a.js']));
  expect(stdout).not.toMatch('No tests found');
  expect(stderr).toMatch('PASS __tests__/a.test.js');
  expect(stderr).not.toMatch('PASS __tests__/b.test.js');
});
