/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import fs from 'fs';
import path from 'path';
import {extractSummary} from '../Utils';
import runJest from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

const DIR = path.resolve(__dirname, '../coverage-report');

test('outputs coverage report', () => {
  const {stdout, status} = runJest(DIR, ['--no-cache', '--coverage'], {
    stripAnsi: true,
  });
  const coverageDir = path.join(DIR, 'coverage');

  // - the `setup.js` file is ignored and should not be in the coverage report.
  // - `SumDependency.js` is mocked and the real module is never required but
  //  is listed with 0 % coverage.
  // - `notRequiredInTestSuite.js` is not required but it is listed
  //  with 0 % coverage.
  expect(wrap(stdout)).toMatchSnapshot();

  expect(() => fs.accessSync(coverageDir, fs.F_OK)).not.toThrow();
  expect(status).toBe(0);
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

test('json reporter printing with --coverage', () => {
  const {stderr, status} = runJest('json-reporter', ['--coverage'], {
    stripAnsi: true,
  });
  const {summary} = extractSummary(stderr);
  expect(status).toBe(1);
  expect(wrap(summary)).toMatchSnapshot();
});

test('outputs coverage report as json', () => {
  const {stdout, status} = runJest(
    DIR,
    ['--no-cache', '--coverage', '--json'],
    {stripAnsi: true},
  );
  expect(status).toBe(0);
  expect(() => JSON.parse(stdout)).not.toThrow();
});

test('outputs coverage report when text is requested', () => {
  const {stdout, status} = runJest(
    DIR,
    [
      '--no-cache',
      '--coverage',
      '--coverageReporters=text',
      '--coverageReporters=html',
    ],
    {stripAnsi: true},
  );
  expect(status).toBe(0);
  expect(stdout).toMatch(/Stmts | . Branch/);
  expect(wrap(stdout)).toMatchSnapshot();
});

test('outputs coverage report when text-summary is requested', () => {
  const {stdout, status} = runJest(
    DIR,
    ['--no-cache', '--coverage', '--coverageReporters=text-summary'],
    {stripAnsi: true},
  );
  expect(status).toBe(0);
  expect(stdout).toMatch(/Coverage summary/);
  expect(wrap(stdout)).toMatchSnapshot();
});

test('outputs coverage report when text and text-summary is requested', () => {
  const {stdout, status} = runJest(
    DIR,
    [
      '--no-cache',
      '--coverage',
      '--coverageReporters=text-summary',
      '--coverageReporters=text',
    ],
    {stripAnsi: true},
  );
  expect(status).toBe(0);
  expect(stdout).toMatch(/Stmts | . Branch/);
  expect(stdout).toMatch(/Coverage summary/);
  expect(wrap(stdout)).toMatchSnapshot();
});

test('does not output coverage report when html is requested', () => {
  const {stdout, status} = runJest(
    DIR,
    ['--no-cache', '--coverage', '--coverageReporters=html'],
    {stripAnsi: true},
  );
  expect(status).toBe(0);
  expect(stdout).toMatch(/^$/);
  expect(wrap(stdout)).toMatchSnapshot();
});

test('collects coverage from duplicate files avoiding shared cache', () => {
  const args = [
    '--coverage',
    // Ensure the status code is non-zero if super edge case with coverage triggers
    '--coverageThreshold',
    '{"global": {"lines": 100}}',
    '--collectCoverageOnlyFrom',
    'cached-duplicates/a/identical.js',
    '--collectCoverageOnlyFrom',
    'cached-duplicates/b/identical.js',
    '--',
    'identical.test.js',
  ];
  // Run once to prime the cache
  runJest(DIR, args, {stripAnsi: true});

  // Run for the second time
  const {stdout, status} = runJest(DIR, args, {stripAnsi: true});
  expect(wrap(stdout)).toMatchSnapshot();
  expect(status).toBe(0);
});

test('generates coverage when using the testRegex config param ', () => {
  const {stdout, status} = runJest(DIR, [
    '--no-cache',
    '--testRegex=__tests__',
    '--coverage',
  ]);
  expect(wrap(stdout)).toMatchSnapshot();
  expect(status).toBe(0);
});
