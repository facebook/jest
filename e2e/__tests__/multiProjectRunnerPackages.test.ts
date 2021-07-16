/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { tmpdir } from 'os';
import * as path from 'path';
import runJest from '../runJest';
import { cleanup, writeFiles } from '../Utils';

const DIR = path.resolve(tmpdir(), 'multi-project-runner-test');

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));

test.each([{projectPath: 'packages/somepackage'}, {projectPath: 'packages/*'}])(
  'allows a single non-root project',
  ({projectPath}: {projectPath: string}) => {
    writeFiles(DIR, {
      'package.json': `
        {
          "jest": {
            "testMatch": ["<rootDir>/packages/somepackage/test.js"],
            "projects": [
              "${projectPath}"
            ]
          }
        }
      `,
      'packages/somepackage/package.json': `
        {
          "jest": {
            "displayName": "somepackage"
          }
        }
      `,
      'packages/somepackage/test.js': `
        test('1+1', () => {
          expect(1).toBe(1);
        });
      `,
    });

    const {stdout, stderr, exitCode} = runJest(DIR, ['--no-watchman']);
    expect(stderr).toContain('PASS somepackage packages/somepackage/test.js');
    expect(stderr).toContain('Test Suites: 1 passed, 1 total');
    expect(stdout).toEqual('');
    expect(exitCode).toEqual(0);
  },
);

test.each([
  {displayName: 'p1', projectPath: 'packages/p1'},
  {displayName: 'p2', projectPath: 'packages/p2'},
])(
  'correctly runs a single non-root project',
  ({projectPath, displayName}: {projectPath: string; displayName: string}) => {
    writeFiles(DIR, {
      'package.json': `
        {
          "jest": {
            "projects": [
              "${projectPath}"
            ]
          }
        }
      `,
      'packages/p1/package.json': `
        {
          "jest": {
            "displayName": "p1"
          }
        }
      `,
      'packages/p1/test.js': `
        test('1+1', () => {
          expect(1).toBe(1);
        });
      `,
      'packages/p2/package.json': `
        {
          "jest": {
            "displayName": "p2"
          }
        }
      `,
      'packages/p2/test.js': `
        test('1+1', () => {
          expect(1).toBe(1);
        });
      `,
    });

    const {stdout, stderr, exitCode} = runJest(DIR, ['--no-watchman']);
    expect(stderr).toContain(`PASS ${displayName} ${projectPath}/test.js`);
    expect(stderr).toContain('Test Suites: 1 passed, 1 total');
    expect(stdout).toEqual('');
    expect(exitCode).toEqual(0);
  },
);
