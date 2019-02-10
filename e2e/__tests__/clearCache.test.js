/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import runJest from '../runJest';

const CACHE = path.resolve(os.tmpdir(), 'clear-cache-directory');

describe('jest --clearCache', () => {
  test('normal run results in cache directory being written', () => {
    const {status} = runJest('clear-cache', [`--cacheDirectory=${CACHE}`]);

    expect(fs.existsSync(CACHE)).toBe(true);
    expect(status).toBe(0);
  });
  test('clearCache results in deleted directory and exit status 0', () => {
    expect(fs.existsSync(CACHE)).toBe(true);

    const {status, stdout, stderr} = runJest('clear-cache', [
      '--clearCache',
      `--cacheDirectory=${CACHE}`,
    ]);

    expect(fs.existsSync(CACHE)).toBe(false);
    expect(stdout).toBe(`Cleared ${CACHE}`);
    expect(stderr).toBe('');
    expect(status).toBe(0);
  });
});
