/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Context} from 'types/Context';
import type {Glob, GlobalConfig, Path} from 'types/Config';
import type {Test} from 'types/TestRunner';
import type {ChangedFilesInfo} from 'types/ChangedFiles';

import path from 'path';
import micromatch from 'micromatch';
import DependencyResolver from 'jest-resolve-dependencies';
import testPathPatternToRegExp from './testPathPatternToRegexp';
import {escapePathForRegex} from 'jest-regex-util';
import {replaceRootDirInPath} from 'jest-config';
import {buildSnapshotResolver} from 'jest-snapshot';
import {replacePathSepForGlob} from 'jest-util';

type SearchResult = {|
  noSCM?: boolean,
  stats?: {[key: string]: number},
  collectCoverageFrom?: Set<string>,
  tests: Array<Test>,
  total?: number,
|};

export type TestSelectionConfig = {|
  input?: string,
  findRelatedTests?: boolean,
  onlyChanged?: boolean,
  paths?: Array<Path>,
  shouldTreatInputAsPattern?: boolean,
  testPathPattern?: string,
  watch?: boolean,
|};

type FilterResult = {
  test: string,
  message: string,
};

const globsToMatcher = (globs: ?Array<Glob>) => {
  if (globs == null || globs.length === 0) {
    return () => true;
  }

  return path =>
    micromatch.some(replacePathSepForGlob(path), globs, {dot: true});
};

const regexToMatcher = (testRegex: Array<string>) => {
  if (!testRegex.length) {
    return () => true;
  }

  return path => testRegex.some(testRegex => new RegExp(testRegex).test(path));
};

const toTests = (context, tests) =>
  tests.map(path => ({
    context,
    duration: undefined,
    path,
  }));

export default class SearchSource {
  _context: Context;
  _rootPattern: RegExp;
  _testIgnorePattern: ?RegExp;
  _testPathCases: {
    roots: (path: Path) => boolean,
    testMatch: (path: Path) => boolean,
    testRegex: (path: Path) => boolean,
    testPathIgnorePatterns: (path: Path) => boolean,
  };

  constructor(context: Context) {
    const {config} = context;
    this._context = context;
    this._rootPattern = new RegExp(
      config.roots.map(dir => escapePathForRegex(dir + path.sep)).join('|'),
    );

    const ignorePattern = config.testPathIgnorePatterns;
    this._testIgnorePattern = ignorePattern.length
      ? new RegExp(ignorePattern.join('|'))
      : null;

    this._testPathCases = {
      roots: path => this._rootPattern.test(path),
      testMatch: globsToMatcher(config.testMatch),
      testPathIgnorePatterns: path =>
        !this._testIgnorePattern || !this._testIgnorePattern.test(path),
      testRegex: regexToMatcher(config.testRegex),
    };
  }

  _filterTestPathsWithStats(
    allPaths: Array<Test>,
    testPathPattern?: string,
  ): SearchResult {
    const data = {
      stats: {},
      tests: [],
      total: allPaths.length,
    };

    const testCases = Object.assign({}, this._testPathCases);
    if (testPathPattern) {
      const regex = testPathPatternToRegExp(testPathPattern);
      testCases.testPathPattern = path => regex.test(path);
    }

    const testCasesKeys = Object.keys(testCases);
    data.tests = allPaths.filter(test =>
      testCasesKeys.reduce((flag, key) => {
        if (testCases[key](test.path)) {
          data.stats[key] = ++data.stats[key] || 1;
          return flag && true;
        }
        data.stats[key] = data.stats[key] || 0;
        return false;
      }, true),
    );

    return data;
  }

  _getAllTestPaths(testPathPattern: string): SearchResult {
    return this._filterTestPathsWithStats(
      toTests(this._context, this._context.hasteFS.getAllFiles()),
      testPathPattern,
    );
  }

  isTestFilePath(path: Path): boolean {
    return Object.keys(this._testPathCases).every(key =>
      this._testPathCases[key](path),
    );
  }

  findMatchingTests(testPathPattern: string): SearchResult {
    return this._getAllTestPaths(testPathPattern);
  }

  findRelatedTests(
    allPaths: Set<Path>,
    collectCoverage: boolean,
  ): SearchResult {
    const dependencyResolver = new DependencyResolver(
      this._context.resolver,
      this._context.hasteFS,
      buildSnapshotResolver(this._context.config),
    );

    if (!collectCoverage) {
      return {
        tests: toTests(
          this._context,
          dependencyResolver.resolveInverse(
            allPaths,
            this.isTestFilePath.bind(this),
            {skipNodeResolution: this._context.config.skipNodeResolution},
          ),
        ),
      };
    }

    const testModulesMap = dependencyResolver.resolveInverseModuleMap(
      allPaths,
      this.isTestFilePath.bind(this),
      {skipNodeResolution: this._context.config.skipNodeResolution},
    );

    const allPathsAbsolute = Array.from(allPaths).map(p => path.resolve(p));

    const collectCoverageFrom = new Set();

    testModulesMap.forEach(testModule => {
      if (!testModule.dependencies) {
        return;
      }

      testModule.dependencies
        .filter(p => allPathsAbsolute.includes(p))
        .map(filename => {
          filename = replaceRootDirInPath(
            this._context.config.rootDir,
            filename,
          );
          return path.isAbsolute(filename)
            ? path.relative(this._context.config.rootDir, filename)
            : filename;
        })
        .forEach(filename => collectCoverageFrom.add(filename));
    });

    return {
      collectCoverageFrom,
      tests: toTests(
        this._context,
        testModulesMap.map(testModule => testModule.file),
      ),
    };
  }

  findTestsByPaths(paths: Array<Path>): SearchResult {
    return {
      tests: toTests(
        this._context,
        paths
          .map(p => path.resolve(this._context.config.cwd, p))
          .filter(this.isTestFilePath.bind(this)),
      ),
    };
  }

  findRelatedTestsFromPattern(
    paths: Array<Path>,
    collectCoverage: boolean,
  ): SearchResult {
    if (Array.isArray(paths) && paths.length) {
      const resolvedPaths = paths.map(p =>
        path.resolve(this._context.config.cwd, p),
      );
      return this.findRelatedTests(new Set(resolvedPaths), collectCoverage);
    }
    return {tests: []};
  }

  findTestRelatedToChangedFiles(
    changedFilesInfo: ChangedFilesInfo,
    collectCoverage: boolean,
  ) {
    const {repos, changedFiles} = changedFilesInfo;
    // no SCM (git/hg/...) is found in any of the roots.
    const noSCM = Object.keys(repos).every(scm => repos[scm].size === 0);
    return noSCM
      ? {noSCM: true, tests: []}
      : this.findRelatedTests(changedFiles, collectCoverage);
  }

  _getTestPaths(
    globalConfig: GlobalConfig,
    changedFiles: ?ChangedFilesInfo,
  ): SearchResult {
    const paths = globalConfig.nonFlagArgs;

    if (globalConfig.onlyChanged) {
      if (!changedFiles) {
        throw new Error('Changed files must be set when running with -o.');
      }

      return this.findTestRelatedToChangedFiles(
        changedFiles,
        globalConfig.collectCoverage,
      );
    } else if (globalConfig.runTestsByPath && paths && paths.length) {
      return this.findTestsByPaths(paths);
    } else if (globalConfig.findRelatedTests && paths && paths.length) {
      return this.findRelatedTestsFromPattern(
        paths,
        globalConfig.collectCoverage,
      );
    } else if (globalConfig.testPathPattern != null) {
      return this.findMatchingTests(globalConfig.testPathPattern);
    } else {
      return {tests: []};
    }
  }

  async getTestPaths(
    globalConfig: GlobalConfig,
    changedFiles: ?ChangedFilesInfo,
  ): Promise<SearchResult> {
    const searchResult = this._getTestPaths(globalConfig, changedFiles);

    const filterPath = globalConfig.filter;

    if (filterPath && !globalConfig.skipFilter) {
      const tests = searchResult.tests;

      // $FlowFixMe: dynamic require.
      const filter: Array<FilterResult> = require(filterPath);
      const filterResult = await filter(tests.map(test => test.path));

      if (!Array.isArray(filterResult.filtered)) {
        throw new Error(
          `Filter ${filterPath} did not return a valid test list`,
        );
      }

      const filteredSet = new Set(
        filterResult.filtered.map(result => result.test),
      );

      return {
        ...searchResult,
        tests: tests.filter(test => filteredSet.has(test.path)),
      };
    }

    return searchResult;
  }
}
