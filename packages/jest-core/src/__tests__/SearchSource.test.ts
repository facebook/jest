/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as path from 'path';
import type {Config} from '@jest/types';
import {normalize} from 'jest-config';
import type {Test} from 'jest-runner';
import Runtime from 'jest-runtime';
import SearchSource, {SearchResult} from '../SearchSource';

jest.setTimeout(15000);

jest.mock('graceful-fs', () => {
  const realFs = jest.requireActual('fs');

  return {
    ...realFs,
    statSync: path => {
      if (path === '/foo/bar/prefix') {
        return {isDirectory: () => true};
      }

      return realFs.statSync(path);
    },
  };
});

const rootDir = path.resolve(__dirname, 'test_root');
const testRegex = path.sep + '__testtests__' + path.sep;
const testMatch = ['**/__testtests__/**/*'];
const maxWorkers = 1;

const toPaths = (tests: Array<Test>) => tests.map(({path}) => path);

let findMatchingTests: (config: Config.ProjectConfig) => Promise<SearchResult>;

describe('SearchSource', () => {
  const id = 'SearchSource';
  let searchSource: SearchSource;

  describe('isTestFilePath', () => {
    let config;

    beforeEach(() => {
      config = normalize(
        {
          id,
          rootDir: '.',
          roots: [],
        },
        {} as Config.Argv,
      ).options;
      return Runtime.createContext(config, {maxWorkers, watchman: false}).then(
        context => {
          searchSource = new SearchSource(context);
        },
      );
    });

    // micromatch doesn't support '..' through the globstar ('**') to avoid
    // infinite recursion.
    it('supports ../ paths and unix separators via testRegex', () => {
      if (process.platform !== 'win32') {
        config = normalize(
          {
            id,
            rootDir: '.',
            roots: [],
            testMatch: undefined,
            testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.jsx?$',
          },
          {} as Config.Argv,
        ).options;
        return Runtime.createContext(config, {
          maxWorkers,
          watchman: false,
        }).then(context => {
          searchSource = new SearchSource(context);

          const path = '/path/to/__tests__/foo/bar/baz/../../../test.js';
          expect(searchSource.isTestFilePath(path)).toEqual(true);
        });
      } else {
        return undefined;
      }
    });

    it('supports unix separators', () => {
      if (process.platform !== 'win32') {
        const path = '/path/to/__tests__/test.js';
        expect(searchSource.isTestFilePath(path)).toEqual(true);
      }
    });

    it('supports win32 separators', () => {
      if (process.platform === 'win32') {
        const path = '\\path\\to\\__tests__\\test.js';
        expect(searchSource.isTestFilePath(path)).toEqual(true);
      }
    });
  });

  describe('testPathsMatching', () => {
    beforeEach(() => {
      findMatchingTests = (config: Config.ProjectConfig) =>
        Runtime.createContext(config, {
          maxWorkers,
          watchman: false,
        }).then(context => new SearchSource(context).findMatchingTests());
    });

    it('finds tests matching a pattern via testRegex', () => {
      const {options: config} = normalize(
        {
          id,
          moduleFileExtensions: ['js', 'jsx', 'txt'],
          rootDir,
          testMatch: undefined,
          testRegex: 'not-really-a-test',
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests)
          .map(absPath => path.relative(rootDir, absPath))
          .sort();
        expect(relPaths).toEqual(
          [
            path.normalize('.hiddenFolder/not-really-a-test.txt'),
            path.normalize('__testtests__/not-really-a-test.txt'),
          ].sort(),
        );
      });
    });

    it('finds tests matching a pattern via testMatch', () => {
      const {options: config} = normalize(
        {
          id,
          moduleFileExtensions: ['js', 'jsx', 'txt'],
          rootDir,
          testMatch: ['**/not-really-a-test.txt', '!**/do-not-match-me.txt'],
          testRegex: '',
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests)
          .map(absPath => path.relative(rootDir, absPath))
          .sort();
        expect(relPaths).toEqual(
          [
            path.normalize('.hiddenFolder/not-really-a-test.txt'),
            path.normalize('__testtests__/not-really-a-test.txt'),
          ].sort(),
        );
      });
    });

    it('finds tests matching a JS regex pattern', () => {
      const {options: config} = normalize(
        {
          id,
          moduleFileExtensions: ['js', 'jsx'],
          rootDir,
          testMatch: undefined,
          testRegex: 'test.jsx?',
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('__testtests__/test.js'),
          path.normalize('__testtests__/test.jsx'),
        ]);
      });
    });

    it('finds tests matching a JS glob pattern', () => {
      const {options: config} = normalize(
        {
          id,
          moduleFileExtensions: ['js', 'jsx'],
          rootDir,
          testMatch: ['**/test.js?(x)'],
          testRegex: '',
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('__testtests__/test.js'),
          path.normalize('__testtests__/test.jsx'),
        ]);
      });
    });

    it('finds tests matching a JS with overriding glob patterns', () => {
      const {options: config} = normalize(
        {
          id,
          moduleFileExtensions: ['js', 'jsx'],
          rootDir,
          testMatch: [
            '**/*.js?(x)',
            '!**/test.js?(x)',
            '**/test.js',
            '!**/test.js',
          ],
          testRegex: '',
        },
        {} as Config.Argv,
      );

      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('module.jsx'),
          path.normalize('noTests.js'),
        ]);
      });
    });

    it('finds tests with default file extensions using testRegex', () => {
      const {options: config} = normalize(
        {
          id,
          rootDir,
          testMatch: undefined,
          testRegex,
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('__testtests__/test.js'),
          path.normalize('__testtests__/test.jsx'),
        ]);
      });
    });

    it('finds tests with default file extensions using testMatch', () => {
      const {options: config} = normalize(
        {
          id,
          rootDir,
          testMatch,
          testRegex: '',
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('__testtests__/test.js'),
          path.normalize('__testtests__/test.jsx'),
        ]);
      });
    });

    it('finds tests with parentheses in their rootDir when using testMatch', () => {
      const {options: config} = normalize(
        {
          id,
          rootDir: path.resolve(__dirname, 'test_root_with_(parentheses)'),
          testMatch: ['<rootDir>**/__testtests__/**/*'],
          testRegex: undefined,
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          expect.stringContaining(path.normalize('__testtests__/test.js')),
        ]);
      });
    });

    it('finds tests with similar but custom file extensions', () => {
      const {options: config} = normalize(
        {
          id,
          moduleFileExtensions: ['js', 'jsx'],
          rootDir,
          testMatch,
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('__testtests__/test.js'),
          path.normalize('__testtests__/test.jsx'),
        ]);
      });
    });

    it('finds tests with totally custom foobar file extensions', () => {
      const {options: config} = normalize(
        {
          id,
          moduleFileExtensions: ['js', 'foobar'],
          rootDir,
          testMatch,
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('__testtests__/test.foobar'),
          path.normalize('__testtests__/test.js'),
        ]);
      });
    });

    it('finds tests with many kinds of file extensions', () => {
      const {options: config} = normalize(
        {
          id,
          moduleFileExtensions: ['js', 'jsx'],
          rootDir,
          testMatch,
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('__testtests__/test.js'),
          path.normalize('__testtests__/test.jsx'),
        ]);
      });
    });

    it('finds tests using a regex only', () => {
      const {options: config} = normalize(
        {
          id,
          rootDir,
          testMatch: undefined,
          testRegex,
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('__testtests__/test.js'),
          path.normalize('__testtests__/test.jsx'),
        ]);
      });
    });

    it('finds tests using a glob only', () => {
      const {options: config} = normalize(
        {
          id,
          rootDir,
          testMatch,
          testRegex: '',
        },
        {} as Config.Argv,
      );
      return findMatchingTests(config).then(data => {
        const relPaths = toPaths(data.tests).map(absPath =>
          path.relative(rootDir, absPath),
        );
        expect(relPaths.sort()).toEqual([
          path.normalize('__testtests__/test.js'),
          path.normalize('__testtests__/test.jsx'),
        ]);
      });
    });
  });

  describe('findRelatedTests', () => {
    const rootDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'jest-runtime',
      'src',
      '__tests__',
      'test_root',
    );
    const rootPath = path.join(rootDir, 'root.js');

    beforeEach(async () => {
      const {options: config} = normalize(
        {
          haste: {
            hasteImplModulePath: path.join(
              __dirname,
              '..',
              '..',
              '..',
              'jest-haste-map',
              'src',
              '__tests__',
              'haste_impl.js',
            ),
          },
          id: 'SearchSource-findRelatedTests-tests',
          rootDir,
        },
        {} as Config.Argv,
      );
      const context = await Runtime.createContext(config, {
        maxWorkers,
        watchman: false,
      });
      searchSource = new SearchSource(context);
    });

    it('makes sure a file is related to itself', () => {
      const data = searchSource.findRelatedTests(new Set([rootPath]), false);
      expect(toPaths(data.tests)).toEqual([rootPath]);
    });

    it('finds tests that depend directly on the path', () => {
      const filePath = path.join(rootDir, 'RegularModule.js');
      const file2Path = path.join(rootDir, 'RequireRegularModule.js');
      const parentDep = path.join(rootDir, 'ModuleWithSideEffects.js');
      const data = searchSource.findRelatedTests(new Set([filePath]), false);
      expect(toPaths(data.tests).sort()).toEqual([
        parentDep,
        filePath,
        file2Path,
        rootPath,
      ]);
    });

    it('excludes untested files from coverage', () => {
      const unrelatedFile = path.join(rootDir, 'JSONFile.json');
      const regular = path.join(rootDir, 'RegularModule.js');
      const requireRegular = path.join(rootDir, 'RequireRegularMode.js');

      const data = searchSource.findRelatedTests(
        new Set([regular, requireRegular, unrelatedFile]),
        true,
      );
      expect(Array.from(data.collectCoverageFrom || [])).toEqual([
        'RegularModule.js',
      ]);
    });
  });

  describe('findRelatedTestsFromPattern', () => {
    beforeEach(async () => {
      const {options: config} = normalize(
        {
          id,
          moduleFileExtensions: ['js', 'jsx', 'foobar'],
          rootDir,
          testMatch,
        },
        {} as Config.Argv,
      );
      const context = await Runtime.createContext(config, {
        maxWorkers,
        watchman: false,
      });
      searchSource = new SearchSource(context);
    });

    it('returns empty search result for empty input', () => {
      const input: Array<Config.Path> = [];
      const data = searchSource.findRelatedTestsFromPattern(input, false);
      expect(data.tests).toEqual([]);
    });

    it('returns empty search result for invalid input', () => {
      const input = ['non-existend.js'];
      const data = searchSource.findRelatedTestsFromPattern(input, false);
      expect(data.tests).toEqual([]);
    });

    it('returns empty search result if no related tests were found', () => {
      const input = ['no_tests.js'];
      const data = searchSource.findRelatedTestsFromPattern(input, false);
      expect(data.tests).toEqual([]);
    });

    it('finds tests for a single file', () => {
      const input = ['packages/jest-core/src/__tests__/test_root/module.jsx'];
      const data = searchSource.findRelatedTestsFromPattern(input, false);
      expect(toPaths(data.tests).sort()).toEqual([
        path.join(rootDir, '__testtests__', 'test.js'),
        path.join(rootDir, '__testtests__', 'test.jsx'),
      ]);
    });

    it('finds tests for multiple files', () => {
      const input = [
        'packages/jest-core/src/__tests__/test_root/module.jsx',
        'packages/jest-core/src/__tests__/test_root/module.foobar',
      ];
      const data = searchSource.findRelatedTestsFromPattern(input, false);
      expect(toPaths(data.tests).sort()).toEqual([
        path.join(rootDir, '__testtests__', 'test.foobar'),
        path.join(rootDir, '__testtests__', 'test.js'),
        path.join(rootDir, '__testtests__', 'test.jsx'),
      ]);
    });

    it('does not mistake roots folders with prefix names', async () => {
      if (process.platform !== 'win32') {
        const config = normalize(
          {
            id,
            rootDir: '.',
            roots: ['/foo/bar/prefix'],
          },
          {} as Config.Argv,
        ).options;

        searchSource = new SearchSource(
          await Runtime.createContext(config, {maxWorkers, watchman: false}),
        );

        const input = ['/foo/bar/prefix-suffix/__tests__/my-test.test.js'];
        const data = searchSource.findTestsByPaths(input);
        expect(data.tests).toEqual([]);
      }
    });
  });

  describe('findRelatedSourcesFromTestsInChangedFiles', () => {
    const rootDir = path.resolve(
      __dirname,
      '../../../jest-runtime/src/__tests__/test_root',
    );

    beforeEach(async () => {
      const {options: config} = normalize(
        {
          haste: {
            hasteImplModulePath: path.resolve(
              __dirname,
              '../../../jest-haste-map/src/__tests__/haste_impl.js',
            ),
          },
          id: 'SearchSource-findRelatedSourcesFromTestsInChangedFiles-tests',
          rootDir,
        },
        {} as Config.Argv,
      );
      const context = await Runtime.createContext(config, {
        maxWorkers,
        watchman: false,
      });
      searchSource = new SearchSource(context);
    });

    it('return empty set if no SCM', () => {
      const requireRegularModule = path.join(
        rootDir,
        'RequireRegularModule.js',
      );
      const sources = searchSource.findRelatedSourcesFromTestsInChangedFiles({
        changedFiles: new Set([requireRegularModule]),
        repos: {
          git: new Set(),
          hg: new Set(),
        },
      });
      expect(sources).toEqual([]);
    });

    it('return sources required by tests', () => {
      const regularModule = path.join(rootDir, 'RegularModule.js');
      const requireRegularModule = path.join(
        rootDir,
        'RequireRegularModule.js',
      );
      const sources = searchSource.findRelatedSourcesFromTestsInChangedFiles({
        changedFiles: new Set([requireRegularModule]),
        repos: {
          git: new Set('/path/to/git'),
          hg: new Set(),
        },
      });
      expect(sources).toEqual([regularModule]);
    });
  });
});
