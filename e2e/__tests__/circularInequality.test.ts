/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import * as path from 'path';
import {wrap} from 'jest-snapshot-serializer-raw';
import {
  cleanup,
  createEmptyPackage,
  extractSortedSummary,
  writeFiles,
} from '../Utils';
import {runContinuous} from '../runJest';

const tempDir = path.resolve(tmpdir(), 'circular-inequality-test');

beforeEach(() => {
  createEmptyPackage(tempDir);
});

afterEach(() => {
  cleanup(tempDir);
});

test('handles circular inequality properly', async () => {
  const testFileContent = `
    it('test', () => {
      const foo = {};
      foo.ref = foo;

      expect(foo).toEqual({});
    });
  `;

  writeFiles(tempDir, {
    '__tests__/test-1.js': testFileContent,
    '__tests__/test-2.js': testFileContent,
  });

  const {end, waitUntil} = runContinuous(
    tempDir,
    ['--no-watchman', '--watch-all'],
    // timeout in case the `waitUntil` below doesn't fire
    {stripAnsi: true, timeout: 5000},
  );

  await waitUntil(({stderr}) => stderr.includes('Ran all test suites.'));

  const {stderr} = await end();

  const {summary, rest} = extractSortedSummary(stderr);
  expect(wrap(rest)).toMatchSnapshot();
  expect(wrap(summary)).toMatchSnapshot();
});
