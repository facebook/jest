/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import * as path from 'path';
import {wrap} from 'jest-snapshot-serializer-raw';
import {cleanup, extractSummary, sortLines, writeFiles} from '../Utils';
import runJest, {getConfig} from '../runJest';

const DIR = path.resolve(tmpdir(), 'multi-project-runner-test');

const SAMPLE_FILE_CONTENT = 'module.exports = {};';

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));

test("--listTests doesn't duplicate the test files", () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '/project1.js': `module.exports = {rootDir: './', displayName: 'BACKEND'}`,
    '/project2.js': `module.exports = {rootDir: './', displayName: 'BACKEND'}`,
    '__tests__/inBothProjectsTest.js': `test('test', () => {});`,
    'package.json': JSON.stringify({
      jest: {projects: ['<rootDir>/project1.js', '<rootDir>/project2.js']},
    }),
  });

  const {stdout} = runJest(DIR, ['--listTests']);
  expect(stdout.split('\n')).toHaveLength(1);
  expect(stdout).toMatch('inBothProjectsTest.js');
});

test('can pass projects or global config', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    'base_config.js': `
      module.exports = {
        haste: {
          hasteImplModulePath: '<rootDir>/hasteImpl.js',
        },
      };
    `,
    'hasteImpl.js': `
      const path = require('path');
      module.exports = {
        getHasteName(filename) {
          return filename
            .substr(filename.lastIndexOf(path.sep) + 1)
            .replace(/\.js$/, '');
        },
      };
    `,
    'package.json': '{}',
    'project1/__tests__/file1.test.js': `
      const file1 = require('file1');
      test('file1', () => {});
    `,
    'project1/file1.js': SAMPLE_FILE_CONTENT,
    'project1/jest.config.js': `module.exports = {rootDir: './', displayName: 'BACKEND',         haste: {
              hasteImplModulePath: '<rootDir>/../hasteImpl.js',
            },}`,
    'project2/__tests__/file1.test.js': `
      const file1 = require('file1');
      test('file1', () => {});
    `,
    'project2/file1.js': SAMPLE_FILE_CONTENT,
    'project2/jest.config.js': `module.exports = {rootDir: './',         haste: {
              hasteImplModulePath: '<rootDir>/../hasteImpl.js',
            },}`,
    'project3/__tests__/file1.test.js': `
      const file1 = require('file1');
      test('file1', () => {});
    `,
    'project3/file1.js': SAMPLE_FILE_CONTENT,
    'project3/jest.config.js': `module.exports = {rootDir: './', displayName: 'UI',         haste: {
              hasteImplModulePath: '<rootDir>/../hasteImpl.js',
            },}`,
  });
  let stderr;

  ({stderr} = runJest(DIR, ['--no-watchman', '--config', 'base_config.js']));
  expect(stderr).toMatch(
    'The name `file1` was looked up in the Haste module map. It cannot be resolved, because there exists several different files',
  );

  expect(wrap(extractSummary(stderr).summary)).toMatchSnapshot();

  writeFiles(DIR, {
    'global_config.js': `
      module.exports = {
        projects: ['project1/', 'project2/', 'project3/'],
        haste: {
          hasteImplModulePath: '<rootDir>/hasteImpl.js',
        },
      };
    `,
  });

  ({stderr} = runJest(DIR, [
    '--no-watchman',
    '-i',
    '--projects',
    'project1',
    'project2',
    'project3',
    '--config',
    'base_config.js',
  ]));

  const result1 = extractSummary(stderr);
  expect(wrap(result1.summary)).toMatchSnapshot();
  expect(wrap(sortLines(result1.rest))).toMatchSnapshot();

  ({stderr} = runJest(DIR, [
    '--no-watchman',
    '-i',
    '--config',
    'global_config.js',
  ]));
  const result2 = extractSummary(stderr);

  expect(wrap(result2.summary)).toMatchSnapshot();
  expect(wrap(sortLines(result2.rest))).toMatchSnapshot();

  // make sure different ways of passing projects work exactly the same
  expect(result1.summary).toBe(result2.summary);
  expect(sortLines(result1.rest)).toBe(sortLines(result2.rest));
});

test('"No tests found" message for projects', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    'package.json': '{}',
    'project1/__tests__/file1.test.js': `
      const file1 = require('../file1');
      test('file1', () => {});
    `,
    'project1/file1.js': SAMPLE_FILE_CONTENT,
    'project1/jest.config.js': `module.exports = {rootDir: './'}`,
    'project2/__tests__/file1.test.js': `
      const file1 = require('../file1');
      test('file1', () => {});
    `,
    'project2/file1.js': SAMPLE_FILE_CONTENT,
    'project2/jest.config.js': `module.exports = {rootDir: './'}`,
  });
  const {stdout: verboseOutput} = runJest(DIR, [
    '--no-watchman',
    'xyz321',
    '--verbose',
    '--projects',
    'project1',
    'project2',
  ]);
  expect(verboseOutput).toContain('Pattern: xyz321 - 0 matches');
  const {stdout} = runJest(DIR, [
    '--no-watchman',
    'xyz321',
    '--projects',
    'project1',
    'project2',
  ]);
  expect(stdout).toContain(
    '  6 files checked across 2 projects. ' +
      'Run with `--verbose` for more details.',
  );
});

test('projects can be workspaces with non-JS/JSON files', () => {
  writeFiles(DIR, {
    'package.json': JSON.stringify({
      jest: {
        projects: ['packages/*'],
      },
    }),
    'packages/README.md': '# Packages README',
    'packages/project1/README.md': '# Project1 README',
    'packages/project1/__tests__/file1.test.js': `
    const file1 = require('../file1');
    test('file1', () => {});
    `,
    'packages/project1/file1.js': SAMPLE_FILE_CONTENT,
    'packages/project1/package.json': '{}',
    'packages/project2/__tests__/file2.test.js': `
    const file2 = require('../file2');
    test('file2', () => {});
    `,
    'packages/project2/file2.js': SAMPLE_FILE_CONTENT,
    'packages/project2/package.json': '{}',
  });

  const {exitCode, stdout, stderr} = runJest(DIR, ['--no-watchman']);

  expect(stderr).toContain('Test Suites: 2 passed, 2 total');
  expect(stderr).toContain('PASS packages/project1/__tests__/file1.test.js');
  expect(stderr).toContain('PASS packages/project2/__tests__/file2.test.js');
  expect(stderr).toContain('Ran all test suites in 2 projects.');
  expect(stdout).toEqual('');
  expect(exitCode).toEqual(0);
});

test('objects in project configuration', () => {
  writeFiles(DIR, {
    '__tests__/file1.test.js': `
      test('foo', () => {});
    `,
    '__tests__/file2.test.js': `
      test('bar', () => {});
    `,
    'jest.config.js': `module.exports = {
      projects: [
        { testMatch: ['<rootDir>/__tests__/file1.test.js'] },
        { testMatch: ['<rootDir>/__tests__/file2.test.js'] },
      ]
    };`,
    'package.json': '{}',
  });

  const {stdout, stderr, exitCode} = runJest(DIR, ['--no-watchman']);
  expect(stderr).toContain('Test Suites: 2 passed, 2 total');
  expect(stderr).toContain('PASS __tests__/file1.test.js');
  expect(stderr).toContain('PASS __tests__/file2.test.js');
  expect(stderr).toContain('Ran all test suites in 2 projects.');
  expect(stdout).toEqual('');
  expect(exitCode).toEqual(0);
});

test('allows a single project', () => {
  writeFiles(DIR, {
    '__tests__/file1.test.js': `
      test('foo', () => {});
    `,
    'jest.config.js': `module.exports = {
      projects: [
        { testMatch: ['<rootDir>/__tests__/file1.test.js'] },
      ]
    };`,
    'package.json': '{}',
  });

  const {stdout, stderr, exitCode} = runJest(DIR, ['--no-watchman']);
  expect(stderr).toContain('PASS __tests__/file1.test.js');
  expect(stderr).toContain('Test Suites: 1 passed, 1 total');
  expect(stdout).toEqual('');
  expect(exitCode).toEqual(0);
});

test('Does transform files with the corresponding project transformer', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    'file.js': SAMPLE_FILE_CONTENT,
    'package.json': '{}',
    'project1/__tests__/project1.test.js': `
      const file = require('../../file.js');
      test('file', () => expect(file).toBe('PROJECT1'));
    `,
    'project1/jest.config.js': `
      module.exports = {
        rootDir: './',
        transform: {'file\.js': './transformer.js'},
      };`,
    'project1/transformer.js': `
      module.exports = {
        process: () => 'module.exports = "PROJECT1";',
        getCacheKey: () => 'PROJECT1_CACHE_KEY',
      }
    `,
    'project2/__tests__/project2.test.js': `
      const file = require('../../file.js');
      test('file', () => expect(file).toBe('PROJECT2'));
    `,
    'project2/jest.config.js': `
      module.exports = {
        rootDir: './',
        transform: {'file\.js': './transformer.js'},
      };`,
    'project2/transformer.js': `
      module.exports = {
        process: () => 'module.exports = "PROJECT2";',
        getCacheKey: () => 'PROJECT2_CACHE_KEY',
      }
    `,
  });

  const {stderr} = runJest(DIR, [
    '--no-watchman',
    '-i',
    '--projects',
    'project1',
    'project2',
  ]);

  expect(stderr).toMatch('Ran all test suites in 2 projects.');
  expect(stderr).toMatch('PASS project1/__tests__/project1.test.js');
  expect(stderr).toMatch('PASS project2/__tests__/project2.test.js');
});

describe("doesn't bleed module file extensions resolution with multiple workers", () => {
  test('external config files', () => {
    writeFiles(DIR, {
      '.watchmanconfig': '',
      'file.js': 'module.exports = "file1"',
      'file.p2.js': 'module.exports = "file2"',
      'package.json': '{}',
      'project1/__tests__/project1.test.js': `
      const file = require('../../file');
      test('file 1', () => expect(file).toBe('file1'));
    `,
      'project1/jest.config.js': `
      module.exports = {
        rootDir: '..',
      };`,
      'project2/__tests__/project2.test.js': `
      const file = require('../../file');
      test('file 2', () => expect(file).toBe('file2'));
    `,
      'project2/jest.config.js': `
      module.exports = {
        rootDir: '..',
        moduleFileExtensions: ['p2.js', 'js']
      };`,
    });

    const {configs} = getConfig(DIR, ['--projects', 'project1', 'project2']);

    expect(configs).toHaveLength(2);

    const [{name: name1}, {name: name2}] = configs;

    expect(name1).toEqual(expect.any(String));
    expect(name2).toEqual(expect.any(String));
    expect(name1).toHaveLength(32);
    expect(name2).toHaveLength(32);
    expect(name1).not.toEqual(name2);

    const {stderr} = runJest(DIR, [
      '--no-watchman',
      '-w=2',
      '--projects',
      'project1',
      'project2',
    ]);

    expect(stderr).toMatch('Ran all test suites in 2 projects.');
    expect(stderr).toMatch('PASS project1/__tests__/project1.test.js');
    expect(stderr).toMatch('PASS project2/__tests__/project2.test.js');
  });

  test('inline config files', () => {
    writeFiles(DIR, {
      '.watchmanconfig': '',
      'file.js': 'module.exports = "file1"',
      'file.p2.js': 'module.exports = "file2"',
      'package.json': JSON.stringify({
        jest: {projects: [{}, {moduleFileExtensions: ['p2.js', 'js']}]},
      }),
      'project1/__tests__/project1.test.js': `
      const file = require('../../file');
      test('file 1', () => expect(file).toBe('file1'));
    `,
      'project2/__tests__/project2.test.js': `
      const file = require('../../file');
      test('file 2', () => expect(file).toBe('file2'));
    `,
    });

    const {configs} = getConfig(DIR);

    expect(configs).toHaveLength(2);

    const [{name: name1}, {name: name2}] = configs;

    expect(name1).toEqual(expect.any(String));
    expect(name2).toEqual(expect.any(String));
    expect(name1).toHaveLength(32);
    expect(name2).toHaveLength(32);
    expect(name1).not.toEqual(name2);

    const {stderr} = runJest(DIR, ['--no-watchman', '-w=2']);

    expect(stderr).toMatch('Ran all test suites in 2 projects.');
    expect(stderr).toMatch('PASS project1/__tests__/project1.test.js');
    expect(stderr).toMatch('PASS project2/__tests__/project2.test.js');
  });
});
