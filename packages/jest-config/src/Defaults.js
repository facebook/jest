/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {DefaultOptions} from 'types/Config';

import {replacePathSepForRegex} from 'jest-regex-util';
import {NODE_MODULES} from './constants';
import getCacheDirectory from './getCacheDirectory';

const NODE_MODULES_REGEXP = replacePathSepForRegex(NODE_MODULES);

export default ({
  automock: false,
  bail: 0,
  browser: false,
  cache: true,
  cacheDirectory: getCacheDirectory(),
  changedFilesWithAncestor: false,
  clearMocks: false,
  collectCoverage: false,
  collectCoverageFrom: null,
  coverageDirectory: null,
  coveragePathIgnorePatterns: [NODE_MODULES_REGEXP],
  coverageReporters: ['json', 'text', 'lcov', 'clover'],
  coverageThreshold: null,
  cwd: process.cwd(),
  dependencyExtractor: null,
  errorOnDeprecated: false,
  expand: false,
  filter: null,
  forceCoverageMatch: [],
  globalSetup: null,
  globalTeardown: null,
  globals: {},
  haste: {
    computeSha1: false,
    providesModuleNodeModules: [],
  },
  maxConcurrency: 5,
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  moduleNameMapper: {},
  modulePathIgnorePatterns: [],
  noStackTrace: false,
  notify: false,
  notifyMode: 'failure-change',
  preset: null,
  prettierPath: 'prettier',
  projects: null,
  resetMocks: false,
  resetModules: false,
  resolver: null,
  restoreMocks: false,
  rootDir: null,
  roots: ['<rootDir>'],
  runTestsByPath: false,
  runner: 'jest-runner',
  setupFiles: [],
  setupFilesAfterEnv: [],
  skipFilter: false,
  snapshotSerializers: [],
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {},
  testFailureExitCode: 1,
  testLocationInResults: false,
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: [NODE_MODULES_REGEXP],
  testRegex: [],
  testResultsProcessor: null,
  testRunner: 'jasmine2',
  testURL: 'http://localhost',
  timers: 'real',
  transform: null,
  transformIgnorePatterns: [NODE_MODULES_REGEXP],
  useStderr: false,
  verbose: null,
  watch: false,
  watchPathIgnorePatterns: [],
  watchman: true,
}: DefaultOptions);
