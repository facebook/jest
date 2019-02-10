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

const DIR = path.resolve(__dirname, '../no-tests-found-test');

describe('No tests are found', () => {
  test('fails the test suite in standard situation', () => {
    const {status, stdout} = runJest(DIR, [
      '--testPathPattern',
      '/non/existing/path/',
    ]);

    expect(stdout).toMatch('No tests found');
    expect(status).toBe(1);
  });

  test("doesn't fail the test suite if --passWithNoTests passed", () => {
    const {status, stdout} = runJest(DIR, [
      '--testPathPattern',
      '/non/existing/path/',
      '--passWithNoTests',
    ]);

    expect(stdout).toMatch('No tests found');
    expect(status).toBe(0);
  });

  test("doesn't fail the test suite if using --lastCommit", () => {
    // Since there are no files in DIR no tests will be found
    const {status, stdout} = runJest(DIR, ['--lastCommit']);

    expect(stdout).toMatch('No tests found');
    expect(status).toBe(0);
  });

  test("doesn't fail the test suite if using --onlyChanged", () => {
    // Since there are no files in DIR no tests will be found
    const {status, stdout} = runJest(DIR, ['--onlyChanged']);

    expect(stdout).toMatch('No tests found');
    expect(status).toBe(0);
  });

  test("doesn't fail the test suite if using --findRelatedTests", () => {
    // Since there are no files in DIR no tests will be found
    const {status, stdout} = runJest(DIR, [
      '--findRelatedTests',
      '/non/existing/path',
    ]);

    expect(stdout).toMatch('No tests found');
    expect(status).toBe(0);
  });
});
