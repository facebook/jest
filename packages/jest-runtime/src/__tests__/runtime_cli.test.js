/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
'use strict';

import path from 'path';
import {sync as spawnSync} from 'execa';
import {skipSuiteOnWindows} from '../../../../scripts/ConditionalTest';

skipSuiteOnWindows();

const JEST_RUNTIME = path.resolve(__dirname, '../../bin/jest-runtime.js');

const run = args =>
  spawnSync(JEST_RUNTIME, args, {
    cwd: process.cwd(),
    env: process.env,
    reject: false,
  });

describe('Runtime', () => {
  describe('cli', () => {
    it('fails with no path', () => {
      const expectedOutput =
        'Please provide a path to a script. (See --help for details)\n';
      expect(run([]).stdout).toBe(expectedOutput);
    });

    it('displays script output', () => {
      const scriptPath = path.resolve(__dirname, './test_root/logging.js');
      expect(run([scriptPath, '--no-cache']).stdout).toMatch('Hello, world!');
    });

    it('always disables automocking', () => {
      const scriptPath = path.resolve(__dirname, './test_root/logging.js');
      const output = run([
        scriptPath,
        '--no-cache',
        '--config=' +
          JSON.stringify({
            automock: true,
          }),
      ]);
      expect(output.stdout).toMatch('Hello, world!');
    });

    it('throws script errors', () => {
      const scriptPath = path.resolve(__dirname, './test_root/throwing.js');
      expect(run([scriptPath, '--no-cache']).stderr).toMatch('Error: throwing');
    });
  });
});
