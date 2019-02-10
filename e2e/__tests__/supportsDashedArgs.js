/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import runJest from '../runJest';

const consoleDir = path.resolve(__dirname, '../console');
const eachDir = path.resolve(__dirname, '../each');

expect.addSnapshotSerializer({
  print: value => value,
  test: received => typeof received === 'string',
});

test('works with passing tests', () => {
  const result = runJest(eachDir, [
    'success.test.js',
    '--runInBand',
    '--collect-coverage',
    '--coverageReporters',
    'text-summary',
    '--clear-mocks',
    '--useStderr',
  ]);
  if (result.status !== 0) {
    console.error(result.stderr);
  }
  expect(result.status).toBe(0);
});

test('throws error for unknown dashed & camelcase args', () => {
  const result = runJest(consoleDir, [
    'success.test.js',
    '--runInBand',
    '--collect-coverage',
    '--coverageReporters',
    'text-summary',
    '--clear-mocks',
    '--doesNotExist',
    '--also-does-not-exist',
    '--useStderr',
  ]);
  expect(result.stderr).toMatchInlineSnapshot(`
● Unrecognized CLI Parameters:

  Following options were not recognized:
  ["doesNotExist", "also-does-not-exist"]

  CLI Options Documentation:
  https://jestjs.io/docs/en/cli.html


`);
  expect(result.status).toBe(1);
});
