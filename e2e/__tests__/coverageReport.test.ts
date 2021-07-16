/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import * as fs from 'graceful-fs';
import {wrap} from 'jest-snapshot-serializer-raw';
import {runYarnInstall} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(__dirname, '../coverage-report');

beforeAll(() => {
  runYarnInstall(DIR);
});

test('outputs coverage report', () => {
  const {stdout, exitCode} = runJest(DIR, ['--no-cache', '--coverage'], {
    stripAnsi: true,
  });
  const coverageDir = path.join(DIR, 'coverage');

  // - the `setup.js` file is ignored and should not be in the coverage report.
  // - `SumDependency.js` is mocked and the real module is never required but
  //  is listed with 0 % coverage.
  // - `notRequiredInTestSuite.js` is not required but it is listed
  //  with 0 % coverage.
  expect(wrap(stdout)).toMatchSnapshot();

  expect(() => fs.accessSync(coverageDir, fs.constants.F_OK)).not.toThrow();
  expect(exitCode).toBe(0);
});

test('collects coverage only from specified file', () => {
  const {stdout} = runJest(
    DIR,
    [
      '--no-cache',
      '--coverage',
      '--collectCoverageFrom', // overwrites the one in package.json
      'file.js',
    ],
    {stripAnsi: true},
  );

  // Coverage report should only have `file.js` coverage info
  expect(wrap(stdout)).toMatchSnapshot();
});

test('collects coverage only from multiple specified files', () => {
  const {stdout} = runJest(
    DIR,
    [
      '--no-cache',
      '--coverage',
      '--collectCoverageFrom',
      'file.js',
      '--collectCoverageFrom',
      'otherFile.js',
    ],
    {stripAnsi: true},
  );

  expect(wrap(stdout)).toMatchSnapshot();
});

test('collects coverage only from specified files avoiding dependencies', () => {
  const {stdout} = runJest(
    DIR,
    [
      '--no-cache',
      '--coverage',
      '--collectCoverageOnlyFrom',
      'sum.js',
      '--',
      'sum.test.js',
    ],
    {stripAnsi: true},
  );

  // Coverage report should only have `sum.js` coverage info
  expect(wrap(stdout)).toMatchSnapshot();
});
