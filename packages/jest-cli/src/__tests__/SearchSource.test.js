/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import path from 'path';

jest.setTimeout(15000);

const rootDir = path.resolve(__dirname, 'test_root');
const testRegex = path.sep + '__testtests__' + path.sep;
const testMatch = ['**/__testtests__/**/*'];
const maxWorkers = 1;

const toPaths = tests => tests.map(({path}) => path);

let findMatchingTests;
let normalize;

describe('SearchSource', () => {
  const name = 'SearchSource';
  let Runtime;
  let SearchSource;
  let searchSource;

  beforeEach(() => {
    Runtime = require('jest-runtime');
    SearchSource = require('../SearchSource').default;
    normalize = require('jest-config').normalize;
  });

  describe('isTestFilePath', () => {
    let config;

    beforeEach(() => {
      config = normalize(
        {
          name,
          rootDir: '.',
          roots: [],
        },
        {},
      ).options;
      return Runtime.createContext(config, {maxWorkers}).then(context => {
        searchSource = new SearchSource(context);
      });
    });

    // micromatch doesn't support '..' through the globstar ('**') to avoid
    // infinite recursion.
    it('supports ../ paths and unix separators via testRegex', () => {
      if (process.platform !== 'win32') {
        config = normalize(
          {
            name,
            rootDir: '.',
            roots: [],
            testMatch: null,
            testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.jsx?$',
          },
          {},
        ).options;
        return Runtime.createContext(config, {
          maxWorkers,
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
      findMatchingTests = config =>
        Runtime.createContext(config, {
          maxWorkers,
        }).then(context => new SearchSource(context).findMatchingTests());
    });

    it('finds tests matching a pattern via testRegex', () => {
      const {options: config} = normalize(
        {
          moduleFileExtensions: ['js', 'jsx', 'txt'],
          name,
          rootDir,
          testMatch: null,
          testRegex: 'not-really-a-test',
        },
        {},
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
          moduleFileExtensions: ['js', 'jsx', 'txt'],
          name,
          rootDir,
          testMatch: ['**/not-really-a-test.txt', '!**/do-not-match-me.txt'],
          testRegex: '',
        },
        {},
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
          moduleFileExtensions: ['js', 'jsx'],
          name,
          rootDir,
          testMatch: null,
          testRegex: 'test.jsx?',
        },
        {},
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
          moduleFileExtensions: ['js', 'jsx'],
          name,
          rootDir,
          testMatch: ['**/test.js?(x)'],
          testRegex: '',
        },
        {},
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

    it('finds tests with default file extensions using testRegex', () => {
      const {options: config} = normalize(
        {
          name,
          rootDir,
          testMatch: null,
          testRegex,
        },
        {},
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
          name,
          rootDir,
          testMatch,
          testRegex: '',
        },
        {},
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
          name,
          rootDir: path.resolve(__dirname, 'test_root_with_(parentheses)'),
          testMatch: ['<rootDir>**/__testtests__/**/*'],
          testRegex: null,
        },
        {},
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
          moduleFileExtensions: ['js', 'jsx'],
          name,
          rootDir,
          testMatch,
        },
        {},
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
          moduleFileExtensions: ['js', 'foobar'],
          name,
          rootDir,
          testMatch,
        },
        {},
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
          moduleFileExtensions: ['js', 'jsx'],
          name,
          rootDir,
          testMatch,
        },
        {},
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
          name,
          rootDir,
          testMatch: null,
          testRegex,
        },
        {},
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
          name,
          rootDir,
          testMatch,
          testRegex: '',
        },
        {},
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

    beforeEach(done => {
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
          name: 'SearchSource-findRelatedTests-tests',
          rootDir,
        },
        {},
      );
      Runtime.createContext(config, {maxWorkers}).then(context => {
        searchSource = new SearchSource(context);
        done();
      });
    });

    it('makes sure a file is related to itself', () => {
      const data = searchSource.findRelatedTests(new Set([rootPath]));
      expect(toPaths(data.tests)).toEqual([rootPath]);
    });

    it('finds tests that depend directly on the path', () => {
      const filePath = path.join(rootDir, 'RegularModule.js');
      const file2Path = path.join(rootDir, 'RequireRegularModule.js');
      const loggingDep = path.join(rootDir, 'logging.js');
      const parentDep = path.join(rootDir, 'ModuleWithSideEffects.js');
      const data = searchSource.findRelatedTests(new Set([filePath]));
      expect(toPaths(data.tests).sort()).toEqual([
        parentDep,
        filePath,
        file2Path,
        loggingDep,
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
      expect(Array.from(data.collectCoverageFrom)).toEqual([
        'RegularModule.js',
      ]);
    });
  });

  describe('findRelatedTestsFromPattern', () => {
    beforeEach(done => {
      const {options: config} = normalize(
        {
          moduleFileExtensions: ['js', 'jsx', 'foobar'],
          name,
          rootDir,
          testMatch,
        },
        {},
      );
      Runtime.createContext(config, {maxWorkers}).then(context => {
        searchSource = new SearchSource(context);
        done();
      });
    });

    it('returns empty search result for empty input', () => {
      const input = [];
      const data = searchSource.findRelatedTestsFromPattern(input);
      expect(data.tests).toEqual([]);
    });

    it('returns empty search result for invalid input', () => {
      const input = ['non-existend.js'];
      const data = searchSource.findRelatedTestsFromPattern(input);
      expect(data.tests).toEqual([]);
    });

    it('returns empty search result if no related tests were found', () => {
      const input = ['no_tests.js'];
      const data = searchSource.findRelatedTestsFromPattern(input);
      expect(data.tests).toEqual([]);
    });

    it('finds tests for a single file', () => {
      const input = ['packages/jest-cli/src/__tests__/test_root/module.jsx'];
      const data = searchSource.findRelatedTestsFromPattern(input);
      expect(toPaths(data.tests).sort()).toEqual([
        path.join(rootDir, '__testtests__', 'test.js'),
        path.join(rootDir, '__testtests__', 'test.jsx'),
      ]);
    });

    it('finds tests for multiple files', () => {
      const input = [
        'packages/jest-cli/src/__tests__/test_root/module.jsx',
        'packages/jest-cli/src/__tests__/test_root/module.foobar',
      ];
      const data = searchSource.findRelatedTestsFromPattern(input);
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
            name,
            rootDir: '.',
            roots: ['/foo/bar/prefix'],
          },
          {},
        ).options;

        searchSource = new SearchSource(
          await Runtime.createContext(config, {maxWorkers}),
        );

        const input = ['/foo/bar/prefix-suffix/__tests__/my-test.test.js'];
        const data = searchSource.findTestsByPaths(input);
        expect(data.tests).toEqual([]);
      }
    });
  });
});
