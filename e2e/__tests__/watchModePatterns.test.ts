/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import * as path from 'path';
import {wrap} from 'jest-snapshot-serializer-raw';
import {cleanup, extractSummaries, writeFiles} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(tmpdir(), 'watch-mode-patterns');
const pluginPath = path.resolve(__dirname, '../MockStdinWatchPlugin');

beforeEach(() => cleanup(DIR));
afterAll(() => cleanup(DIR));

expect.addSnapshotSerializer({
  print: val => val.replace(/\[s\[u/g, '\n'),
  test: val => typeof val === 'string' && val.includes('[s[u'),
});

const setupFiles = (input: Array<{keys: Array<string>}>) => {
  writeFiles(DIR, {
    '__tests__/bar.spec.js': `
      test('bar 1', () => { expect('bar').toBe('bar'); });
      test('bar 2', () => { expect('bar').toBe('bar'); });
    `,
    '__tests__/foo.spec.js': `
      test('foo 1', () => { expect('foo').toBe('foo'); });
      test('foo 2', () => { expect('foo').toBe('foo'); });
    `,
    'package.json': JSON.stringify({
      jest: {
        testEnvironment: 'node',
        watchPlugins: [[pluginPath, {input}]],
      },
    }),
  });
};

test('can press "p" to filter by file name', () => {
  const input = [{keys: ['p', 'bar', '\r']}, {keys: ['q']}];
  setupFiles(input);

  const {exitCode, stdout, stderr} = runJest(DIR, [
    '--no-watchman',
    '--watchAll',
  ]);
  const results = extractSummaries(stderr);

  // contains ansi characters, should not use `wrap`
  expect(stdout).toMatchSnapshot();
  expect(results).toHaveLength(2);
  results.forEach(({rest, summary}) => {
    expect(wrap(rest)).toMatchSnapshot('test results');
    expect(wrap(summary)).toMatchSnapshot('test summary');
  });
  expect(exitCode).toBe(0);
});

test('can press "t" to filter by test name', () => {
  const input = [{keys: ['t', '2', '\r']}, {keys: ['q']}];
  setupFiles(input);

  const {exitCode, stdout, stderr} = runJest(DIR, [
    '--no-watchman',
    '--watchAll',
  ]);
  const results = extractSummaries(stderr);

  // contains ansi characters, should not use `wrap`
  expect(stdout).toMatchSnapshot();
  expect(results).toHaveLength(2);
  results.forEach(({rest, summary}) => {
    expect(wrap(rest)).toMatchSnapshot('test results');
    expect(wrap(summary)).toMatchSnapshot('test summary');
  });
  expect(exitCode).toBe(0);
});
