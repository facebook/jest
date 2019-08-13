/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import micromatch from 'micromatch';
import {Context} from 'jest-runtime';
import {Config} from '@jest/types';
import {Test} from 'jest-runner';
import {ChangedFiles} from 'jest-changed-files';
import DependencyResolver from 'jest-resolve-dependencies';
import {escapePathForRegex} from 'jest-regex-util';
import {replaceRootDirInPath} from 'jest-config';
import {buildSnapshotResolver} from 'jest-snapshot';
import {replacePathSepForGlob, testPathPatternToRegExp} from 'jest-util';
import {TestPathCases, Filter, Stats} from './types';

export type SearchResult = {
  noSCM?: boolean;
  stats?: Stats;
  collectCoverageFrom?: Set<string>;
  tests: Array<Test>;
  total?: number;
};

export type TestSelectionConfig = {
  input?: string;
  findRelatedTests?: Array<string>;
  onlyChanged?: boolean;
  paths?: Array<Config.Path>;
  shouldTreatInputAsPattern?: boolean;
  testPathPattern?: string;
  watch?: boolean;
};

const globsToMatcher = (globs: Array<Config.Glob>) => (path: Config.Path) =>
  micromatch.some(replacePathSepForGlob(path), globs, {dot: true});

const regexToMatcher = (testRegex: Array<string>) => (path: Config.Path) =>
  testRegex.some(testRegex => new RegExp(testRegex).test(path));

const toTests = (context: Context, tests: Array<Config.Path>) =>
  tests.map(path => ({
    context,
    duration: undefined,
    path,
  }));

export default class SearchSource {
  private _context: Context;
  private _testPathCases: TestPathCases = [];

  constructor(context: Context) {
    const {config} = context;
    this._context = context;

    const rootPattern = new RegExp(
      config.roots.map(dir => escapePathForRegex(dir + path.sep)).join('|'),
    );
    this._testPathCases.push({
      isMatch: path => rootPattern.test(path),
      stat: 'roots',
    });

    if (config.testMatch.length) {
      this._testPathCases.push({
        isMatch: globsToMatcher(config.testMatch),
        stat: 'testMatch',
      });
    }

    if (config.testPathIgnorePatterns.length) {
      const testIgnorePatternsRegex = new RegExp(
        config.testPathIgnorePatterns.join('|'),
      );
      this._testPathCases.push({
        isMatch: path => !testIgnorePatternsRegex.test(path),
        stat: 'testPathIgnorePatterns',
      });
    }

    if (config.testRegex.length) {
      this._testPathCases.push({
        isMatch: regexToMatcher(config.testRegex),
        stat: 'testRegex',
      });
    }
  }

  private _filterTestPathsWithStats(
    allPaths: Array<Test>,
    testPathPattern?: string,
  ): SearchResult {
    const data: {
      stats: Stats;
      tests: Array<Test>;
      total: number;
    } = {
      stats: {
        roots: 0,
        testMatch: 0,
        testPathIgnorePatterns: 0,
        testRegex: 0,
      },
      tests: [],
      total: allPaths.length,
    };

    const testCases = Array.from(this._testPathCases); // clone
    if (testPathPattern) {
      const regex = testPathPatternToRegExp(testPathPattern);
      testCases.push({
        isMatch: (path: Config.Path) => regex.test(path),
        stat: 'testPathPattern',
      });
      data.stats.testPathPattern = 0;
    }

    data.tests = allPaths.filter(test => {
      let filterResult = true;
      for (const {isMatch, stat} of testCases) {
        if (isMatch(test.path)) {
          data.stats[stat]!++;
        } else {
          filterResult = false;
        }
      }
      return filterResult;
    });

    return data;
  }

  private _getAllTestPaths(testPathPattern?: string): SearchResult {
    return this._filterTestPathsWithStats(
      toTests(this._context, this._context.hasteFS.getAllFiles()),
      testPathPattern,
    );
  }

  isTestFilePath(path: Config.Path): boolean {
    return this._testPathCases.every(testCase => testCase.isMatch(path));
  }

  findMatchingTests(testPathPattern?: string): SearchResult {
    return this._getAllTestPaths(testPathPattern);
  }

  findRelatedTests(
    allPaths: Set<Config.Path>,
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

    const collectCoverageFrom = new Set<string>();

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

  findTestsByPaths(paths: Array<Config.Path>): SearchResult {
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
    paths: Array<Config.Path>,
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
    changedFilesInfo: ChangedFiles,
    collectCoverage: boolean,
  ) {
    const {repos, changedFiles} = changedFilesInfo;
    // no SCM (git/hg/...) is found in any of the roots.
    const noSCM = (Object.keys(repos) as Array<
      keyof ChangedFiles['repos']
    >).every(scm => repos[scm].size === 0);
    return noSCM
      ? {noSCM: true, tests: []}
      : this.findRelatedTests(changedFiles, collectCoverage);
  }

  private _getTestPaths(
    globalConfig: Config.GlobalConfig,
    changedFiles?: ChangedFiles,
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
    } else if (globalConfig.findRelatedTests.length > 0) {
      const relatedTests = this.findRelatedTestsFromPattern(
        globalConfig.findRelatedTests,
        globalConfig.collectCoverage,
      );
      if (globalConfig.testPathPattern != null) {
        return this._filterTestPathsWithStats(
          relatedTests.tests,
          globalConfig.testPathPattern,
        );
      } else {
        return relatedTests;
      }
    } else if (globalConfig.testPathPattern != null) {
      return this.findMatchingTests(globalConfig.testPathPattern);
    } else {
      return {tests: []};
    }
  }

  async getTestPaths(
    globalConfig: Config.GlobalConfig,
    changedFiles: ChangedFiles | undefined,
    filter?: Filter,
  ): Promise<SearchResult> {
    const searchResult = this._getTestPaths(globalConfig, changedFiles);

    const filterPath = globalConfig.filter;

    if (filter) {
      const tests = searchResult.tests;

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
