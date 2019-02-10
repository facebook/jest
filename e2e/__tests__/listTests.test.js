/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';
import path from 'path';
import {wrap} from 'jest-snapshot-serializer-raw';

const testRootDir = path.resolve(__dirname, '..', '..');

const normalizePaths = rawPaths =>
  rawPaths
    .split(testRootDir)
    .join(`${path.sep}MOCK_ABOLUTE_PATH`)
    .split('\\')
    .join('/');

describe('--listTests flag', () => {
  it('causes tests to be printed in different lines', () => {
    const {status, stdout} = runJest('list-tests', ['--listTests']);

    expect(status).toBe(0);
    expect(
      wrap(
        normalizePaths(stdout)
          .split('\n')
          .sort()
          .join('\n'),
      ),
    ).toMatchSnapshot();
  });

  it('causes tests to be printed out as JSON when using the --json flag', () => {
    const {status, stdout} = runJest('list-tests', ['--listTests', '--json']);

    expect(status).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
    expect(
      wrap(
        JSON.stringify(
          JSON.parse(stdout)
            .map(normalizePaths)
            .sort(),
        ),
      ),
    ).toMatchSnapshot();
  });
});
