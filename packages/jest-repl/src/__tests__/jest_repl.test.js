/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

import {spawnSync} from 'child_process';
import path from 'path';
import {skipSuiteOnWindows} from '../../../../scripts/ConditionalTest';

const JEST_RUNTIME = path.resolve(__dirname, '../../bin/jest-repl.js');

describe('Repl', () => {
  skipSuiteOnWindows();

  describe('cli', () => {
    it('runs without errors', () => {
      const output = spawnSync(JEST_RUNTIME, [], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: process.env,
      });
      expect(output.stdout.trim()).toMatch(/›/);
    });
  });
});
