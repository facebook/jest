/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import * as fs from 'graceful-fs';
import {wrap} from 'jest-snapshot-serializer-raw';
import {extractSortedSummary, extractSummary, run} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(__dirname, '../coverage-report');

beforeAll(() => {
  run('yarn', DIR);
});

test('outputs coverage report', () => {
  const {stdout, exitCode} = runJest(DIR, ['--no-cache', '--coverage'], {
    stripAnsi: true,
  });
  const coverageDir = path.join(DIR, 'coverage');

  const {summary, rest} = extractSortedSummary(stdout);

  // - the `setup.js` file is ignored and should not be in the coverage report.
  // - `SumDependency.js` is mocked and the real module is never required but
  //  is listed with 0 % coverage.
  // - `notRequiredInTestSuite.js` is not required but it is listed
  //  with 0 % coverage.
  expect(wrap(rest)).toMatchSnapshot();
  expect(wrap(summary)).toMatchSnapshot();

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
  const {summary, rest} = extractSortedSummary(stdout);

  // Coverage report should only have `file.js` coverage info
  expect(wrap(summary)).toMatchSnapshot();
  expect(wrap(rest)).toMatchSnapshot();
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
  const {summary, rest} = extractSortedSummary(stdout);

  expect(wrap(summary)).toMatchSnapshot();
  expect(wrap(rest)).toMatchSnapshot();
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
  const {summary, rest} = extractSortedSummary(stdout);

  // Coverage report should only have `sum.js` coverage info
  expect(wrap(summary)).toMatchSnapshot();
  expect(wrap(rest)).toMatchSnapshot();
});

test('json reporter printing with --coverage', () => {
  const {stdout, exitCode} = runJest('json-reporter', ['--coverage'], {
    stripAnsi: true,
  });
  const {summary} = extractSummary(stdout);
  expect(exitCode).toBe(1);
  expect(wrap(summary)).toMatchSnapshot();
});

test('outputs coverage report as json', () => {
  const {stdout, exitCode} = runJest(
    DIR,
    ['--no-cache', '--coverage', '--json'],
    {stripAnsi: true},
  );
  expect(exitCode).toBe(0);
  expect(() => JSON.parse(stdout)).not.toThrow();
});

test('outputs coverage report when text is requested', () => {
  const {stdout, exitCode} = runJest(
    DIR,
    [
      '--no-cache',
      '--coverage',
      '--coverageReporters=text',
      '--coverageReporters=html',
    ],
    {stripAnsi: true},
  );
  expect(exitCode).toBe(0);
  expect(stdout).toMatch(/Stmts | . Branch/);

  const {summary, rest} = extractSortedSummary(stdout);
  expect(wrap(summary)).toMatchSnapshot();
  expect(wrap(rest)).toMatchSnapshot();
});

test('outputs coverage report when text-summary is requested', () => {
  const {stdout, exitCode} = runJest(
    DIR,
    ['--no-cache', '--coverage', '--coverageReporters=text-summary'],
    {stripAnsi: true},
  );
  const {summary, rest} = extractSortedSummary(stdout);

  expect(exitCode).toBe(0);
  expect(stdout).toMatch(/Coverage summary/);
  expect(wrap(summary)).toMatchSnapshot();
  expect(wrap(rest)).toMatchSnapshot();
});

test('outputs coverage report when text and text-summary is requested', () => {
  const {stdout, exitCode} = runJest(
    DIR,
    [
      '--no-cache',
      '--coverage',
      '--coverageReporters=text-summary',
      '--coverageReporters=text',
    ],
    {stripAnsi: true},
  );
  const {summary, rest} = extractSortedSummary(stdout);

  expect(exitCode).toBe(0);
  expect(stdout).toMatch(/Stmts | . Branch/);
  expect(stdout).toMatch(/Coverage summary/);
  expect(wrap(summary)).toMatchSnapshot();
  expect(wrap(rest)).toMatchSnapshot();
});

test('does not output coverage report when html is requested', () => {
  const {stdout, exitCode} = runJest(
    DIR,
    ['--no-cache', '--coverage', '--coverageReporters=html'],
    {stripAnsi: true},
  );
  const {summary, rest} = extractSortedSummary(stdout);

  expect(exitCode).toBe(0);
  expect(wrap(summary)).toMatchSnapshot();
  expect(wrap(rest)).toMatchSnapshot();
});

test('collects coverage from duplicate files avoiding shared cache', () => {
  const args = [
    '--coverage',
    // Ensure the exitCode is non-zero if super edge case with coverage triggers
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
  const {stdout, exitCode} = runJest(DIR, args, {stripAnsi: true});

  const {summary, rest} = extractSortedSummary(stdout);

  expect(wrap(summary)).toMatchSnapshot();
  expect(wrap(rest)).toMatchSnapshot();
  expect(exitCode).toBe(0);
});

test('generates coverage when using the testRegex config param ', () => {
  const {stdout, exitCode} = runJest(DIR, [
    '--no-cache',
    '--testRegex=__tests__',
    '--coverage',
  ]);
  const {summary, rest} = extractSortedSummary(stdout);

  expect(wrap(summary)).toMatchSnapshot();
  expect(wrap(rest)).toMatchSnapshot();
  expect(exitCode).toBe(0);
});
