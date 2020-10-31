/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {join, resolve} from 'path';
import {
  existsSync,
  mkdirSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
} from 'graceful-fs';

import runJest from '../runJest';
import {extractSummary} from '../Utils';

const destRoot = resolve(__dirname, '../preserve-symlinks');
const srcRoot = resolve(__dirname, '../symlinked-source-dir');

const files = [
  'package.json',
  'a.js',
  'b.js',
  'ab.js',
  '__tests__/a.test.js',
  '__tests__/b.test.js',
  '__tests__/ab.test.js',
];

function cleanup() {
  files
    .map(f => join(destRoot, f))
    .filter(f => existsSync(f))
    .forEach(f => {
      unlinkSync(f);
    });
  if (existsSync(join(destRoot, '__tests__'))) {
    rmdirSync(join(destRoot, '__tests__'));
  }
  if (existsSync(destRoot)) {
    rmdirSync(destRoot);
  }
}

beforeAll(() => {
  cleanup();
  mkdirSync(destRoot);
  mkdirSync(join(destRoot, '__tests__'));
  files.forEach(f => {
    symlinkSync(join(srcRoot, f), join(destRoot, f));
  });
});

afterAll(() => {
  cleanup();
});

test('preserving symlinks with environment variable', () => {
  const {stderr, exitCode} = runJest('preserve-symlinks', ['--no-watchman'], {
    preserveSymlinks: '1',
  });
  const {summary, rest} = extractSummary(stderr);
  expect(exitCode).toEqual(0);
  expect(rest.split('\n').length).toEqual(3);
  expect(rest).toMatch('PASS __tests__/ab.test.js');
  expect(rest).toMatch('PASS __tests__/a.test.js');
  expect(rest).toMatch('PASS __tests__/b.test.js');
  expect(summary).toMatch('Test Suites: 3 passed, 3 total');
  expect(summary).toMatch('Tests:       3 passed, 3 total');
  expect(summary).toMatch('Snapshots:   0 total');
});

test('preserving symlinks with --preserve-symlinks node flag', () => {
  const {stderr, exitCode} = runJest('preserve-symlinks', ['--no-watchman'], {
    nodeFlags: ['--preserve-symlinks'],
  });
  const {summary, rest} = extractSummary(stderr);
  expect(exitCode).toEqual(0);
  expect(rest.split('\n').length).toEqual(3);
  expect(rest).toMatch('PASS __tests__/ab.test.js');
  expect(rest).toMatch('PASS __tests__/a.test.js');
  expect(rest).toMatch('PASS __tests__/b.test.js');
  expect(summary).toMatch('Test Suites: 3 passed, 3 total');
  expect(summary).toMatch('Tests:       3 passed, 3 total');
  expect(summary).toMatch('Snapshots:   0 total');
});

test('no preserve symlinks configuration', () => {
  const {exitCode, stdout} = runJest('preserve-symlinks', ['--no-watchman']);
  expect(exitCode).toEqual(1);
  expect(stdout).toMatch('No tests found, exiting with code 1');
});
