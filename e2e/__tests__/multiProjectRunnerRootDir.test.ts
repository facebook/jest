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

test('resolves projects and their <rootDir> properly', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    'package.json': JSON.stringify({
      jest: {
        projects: [
          'project1.conf.json',
          '<rootDir>/project2/project2.conf.json',
        ],
      },
    }),
    'project1.conf.json': JSON.stringify({
      name: 'project1',
      rootDir: './project1',
      // root dir should be this project's directory
      setupFiles: ['<rootDir>/project1_setup.js'],
      testEnvironment: 'node',
    }),
    'project1/__tests__/test.test.js': `test('project1', () => expect(global.project1).toBe(true))`,
    'project1/project1_setup.js': 'global.project1 = true;',
    'project2/__tests__/test.test.js': `test('project2', () => expect(global.project2).toBe(true))`,
    'project2/project2.conf.json': JSON.stringify({
      name: 'project2',
      rootDir: '../', // root dir is set to the top level
      setupFiles: ['<rootDir>/project2/project2_setup.js'], // rootDir shold be of the
      testEnvironment: 'node',
      testPathIgnorePatterns: ['project1'],
    }),
    'project2/project2_setup.js': 'global.project2 = true;',
  });

  let stderr;
  ({stderr} = runJest(DIR, ['--no-watchman']));

  expect(stderr).toMatch('Ran all test suites in 2 projects.');
  expect(stderr).toMatch('PASS project1/__tests__/test.test.js');
  expect(stderr).toMatch('PASS project2/__tests__/test.test.js');

  // Use globs
  writeFiles(DIR, {
    'dir1/random_file': '',
    'dir2/random_file': '',
    'package.json': JSON.stringify({
      jest: {
        projects: ['**/*.conf.json'],
      },
    }),
  });

  ({stderr} = runJest(DIR, ['--no-watchman']));
  expect(stderr).toMatch('Ran all test suites in 2 projects.');
  expect(stderr).toMatch('PASS project1/__tests__/test.test.js');
  expect(stderr).toMatch('PASS project2/__tests__/test.test.js');

  // Include two projects that will resolve to the same config
  writeFiles(DIR, {
    'dir1/random_file': '',
    'dir2/random_file': '',
    'package.json': JSON.stringify({
      jest: {
        projects: [
          'dir1',
          'dir2',
          'project1.conf.json',
          '<rootDir>/project2/project2.conf.json',
        ],
      },
    }),
  });

  ({stderr} = runJest(DIR, ['--no-watchman']));
  expect(stderr).toMatch(
    /Whoops! Two projects resolved to the same config path/,
  );
  expect(stderr).toMatch(`${path.join(DIR, 'package.json')}`);
  expect(stderr).toMatch(/Project 1|2: dir1/);
  expect(stderr).toMatch(/Project 1|2: dir2/);

  // project with a directory/file that does not exist
  writeFiles(DIR, {
    'package.json': JSON.stringify({
      jest: {
        projects: [
          'banana',
          'project1.conf.json',
          '<rootDir>/project2/project2.conf.json',
        ],
      },
    }),
  });

  ({stderr} = runJest(DIR, ['--no-watchman']));
  expect(stderr).toMatch(
    `Can't find a root directory while resolving a config file path.`,
  );
  expect(stderr).toMatch(/banana/);
});
