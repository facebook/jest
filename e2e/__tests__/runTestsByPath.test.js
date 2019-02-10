/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';
import os from 'os';
import path from 'path';
import {cleanup, writeFiles} from '../Utils';

const DIR = path.resolve(os.tmpdir(), 'run-tests-by-path-test');

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));

test('runs tests by exact path', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '__tests__/t1.test.js': 'it("foo", () => {})',
    '__tests__/t2.test.js': 'it("bar", () => {})',
    'package.json': JSON.stringify({jest: {testEnvironment: 'node'}}),
  });

  // Passing an exact path executes only the given test.
  const run1 = runJest(DIR, ['--runTestsByPath', '__tests__/t1.test.js']);
  expect(run1.stderr).toMatch('PASS __tests__/t1.test.js');
  expect(run1.stderr).not.toMatch('PASS __tests__/t2.test.js');

  // When running with thte flag and a pattern, no test is found.
  const run2 = runJest(DIR, ['--runTestsByPath', '__tests__/t']);
  expect(run2.stdout).toMatch(/no tests found/i);

  // When ran without the flag and a pattern, both tests are found.
  const run3 = runJest(DIR, ['__tests__/t']);
  expect(run3.stderr).toMatch('PASS __tests__/t1.test.js');
  expect(run3.stderr).toMatch('PASS __tests__/t2.test.js');
});
