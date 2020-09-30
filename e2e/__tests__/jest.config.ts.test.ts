/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import {wrap} from 'jest-snapshot-serializer-raw';
import runJest from '../runJest';
import {cleanup, extractSummary, writeFiles} from '../Utils';

const DIR = path.resolve(__dirname, '../jest.config.ts');

beforeEach(() => cleanup(DIR));
afterAll(() => cleanup(DIR));

test('works with jest.config.ts', () => {
  writeFiles(DIR, {
    '__tests__/a-giraffe.js': `test('giraffe', () => expect(1).toBe(1));`,
    'jest.config.ts': `export default {testEnvironment: 'jest-environment-jsdom-fifteen', testRegex: '.*-giraffe.js'};`,
    'package.json': '{}',
  });

  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false']);
  const {rest, summary} = extractSummary(stderr);
  expect(exitCode).toBe(0);
  expect(wrap(rest)).toMatchSnapshot();
  expect(wrap(summary)).toMatchSnapshot();
});

test('traverses directory tree up until it finds jest.config', () => {
  writeFiles(DIR, {
    '__tests__/a-giraffe.js': `
    const slash = require('slash');
    test('giraffe', () => expect(1).toBe(1));
    test('abc', () => console.log(slash(process.cwd())));
    `,
    'jest.config.ts': `export default {testEnvironment: 'jest-environment-jsdom-fifteen', testRegex: '.*-giraffe.js'};`,
    'package.json': '{}',
    'some/nested/directory/file.js': '// nothing special',
  });

  const {stderr, exitCode, stdout} = runJest(
    path.join(DIR, 'some', 'nested', 'directory'),
    ['-w=1', '--ci=false'],
    {skipPkgJsonCheck: true},
  );

  // Snapshot the console.loged `process.cwd()` and make sure it stays the same
  expect(
    wrap(stdout.replace(/^\W+(.*)e2e/gm, '<<REPLACED>>')),
  ).toMatchSnapshot();

  const {rest, summary} = extractSummary(stderr);
  expect(exitCode).toBe(0);
  expect(wrap(rest)).toMatchSnapshot();
  expect(wrap(summary)).toMatchSnapshot();
});

test('invalid JS in jest.config.ts', () => {
  writeFiles(DIR, {
    '__tests__/a-giraffe.js': `test('giraffe', () => expect(1).toBe(1));`,
    'jest.config.ts': `export default i'll break this file yo`,
    'package.json': '{}',
  });

  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false']);
  expect(stderr).toMatch(
    'Error: Jest: Failed to parse the TypeScript config file ',
  );
  expect(exitCode).toBe(1);
});
