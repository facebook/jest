/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import * as path from 'path';
import runJest from '../runJest';
import {cleanup, writeFiles} from '../Utils';

const DIR = path.resolve(tmpdir(), 'use-stderr-test');

beforeEach(() => cleanup(DIR));
afterAll(() => cleanup(DIR));

const NUMBER_OF_TESTS_TO_FORCE_USING_WORKERS = 25;

function runTest(useStderr: boolean, forceWorkers: boolean) {
  const additionalTests = {};

  if (forceWorkers) {
    for (let i = 0; i < NUMBER_OF_TESTS_TO_FORCE_USING_WORKERS; i++) {
      additionalTests[
        `__tests__/test${i}.test.js`
      ] = `test('test ${i}', () => {});`;
    }
  }

  writeFiles(DIR, {
    ...additionalTests,
    '__tests__/test.test.js': `
      require('../file1');
      test('file1', () => {
        console.log('Hello from console');
        process.stdout.write('Hello from stdout\\n');
        process.stderr.write('Hello from stderr\\n');
      });
    `,
    '.watchmanconfig': '',
    'file1.js': 'module.exports = {}',
    'package.json': JSON.stringify({jest: {testEnvironment: 'node'}}),
  });

  const {stdout, stderr} = runJest(DIR, [
    '--verbose',
    useStderr ? '--useStderr' : '',
    forceWorkers ? '--maxWorkers=2' : '--runInBand',
  ]);

  if (useStderr) {
    expect(stdout).toBe('');
  }

  const generalOutput = useStderr ? stderr : stdout;
  expect(generalOutput).toContain('Hello from stdout');
  expect(generalOutput).toContain('Hello from console');
  expect(stderr).toMatch(/PASS.*test\.test\.js/);
  expect(stderr).toContain('Hello from stderr');
}

test.each([
  [true, 'in band'],
  [false, 'in band'],
  [true, 'with workers'],
  [false, 'with workers'],
])('passes when useStderr is %s, running %s', (useStderr, runMode) => {
  runTest(useStderr, runMode === 'with workers');
});
