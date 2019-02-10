/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import {skipSuiteOnWindows} from '../../scripts/ConditionalTest';
import {cleanup, extractSummary, writeFiles} from '../Utils';
import runJest from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

const DIR = path.resolve(__dirname, '../cli_accepts_exact_filenames');

skipSuiteOnWindows();

beforeEach(() => cleanup(DIR));
afterAll(() => cleanup(DIR));

test('CLI accepts exact file names if matchers matched', () => {
  writeFiles(DIR, {
    'foo/bar.spec.js': `
      test('foo', () => {});
    `,
    'package.json': JSON.stringify({jest: {testEnvironment: 'node'}}),
  });

  const result = runJest(DIR, ['-i', '--forceExit', './foo/bar.spec.js']);

  expect(result.status).toBe(0);

  const {rest, summary} = extractSummary(result.stderr);

  expect(wrap(rest)).toMatchSnapshot();
  expect(wrap(summary)).toMatchSnapshot();
  expect(result.stdout).toBe('');
});

test('CLI skips exact file names if no matchers matched', () => {
  writeFiles(DIR, {
    'foo/bar.js': `
      test('foo', () => {);
    `,
    'package.json': JSON.stringify({jest: {testEnvironment: 'node'}}),
  });

  const result = runJest(DIR, ['-i', '--forceExit', './foo/bar.js']);

  expect(result.status).toBe(1);
  expect(result.stdout).toMatch(/No tests found([\S\s]*)2 files checked./);
  expect(result.stderr).toEqual('');
});
