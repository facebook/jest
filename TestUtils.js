/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

import type {GlobalConfig, ProjectConfig} from 'types/Config';

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  bail: 0,
  changedFilesWithAncestor: false,
  changedSince: '',
  collectCoverage: false,
  collectCoverageFrom: [],
  collectCoverageOnlyFrom: null,
  coverageDirectory: 'coverage',
  coverageReporters: [],
  coverageThreshold: {global: {}},
  detectLeaks: false,
  detectOpenHandles: false,
  enabledTestsMap: null,
  errorOnDeprecated: false,
  expand: false,
  extraGlobals: [],
  filter: null,
  findRelatedTests: false,
  forceExit: false,
  globalSetup: null,
  globalTeardown: null,
  json: false,
  lastCommit: false,
  listTests: false,
  logHeapUsage: false,
  maxConcurrency: 5,
  maxWorkers: 2,
  noSCM: null,
  noStackTrace: false,
  nonFlagArgs: [],
  notify: false,
  notifyMode: 'failure-change',
  onlyChanged: false,
  onlyFailures: false,
  outputFile: null,
  passWithNoTests: false,
  projects: [],
  replname: null,
  reporters: [],
  rootDir: '/test_root_dir/',
  runTestsByPath: false,
  silent: false,
  skipFilter: false,
  testFailureExitCode: 1,
  testNamePattern: '',
  testPathPattern: '',
  testResultsProcessor: null,
  updateSnapshot: 'none',
  useStderr: false,
  verbose: false,
  watch: false,
  watchAll: false,
  watchPlugins: [],
  watchman: false,
};

const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  automock: false,
  browser: false,
  cache: false,
  cacheDirectory: '/test_cache_dir/',
  clearMocks: false,
  coveragePathIgnorePatterns: [],
  cwd: '/test_root_dir/',
  detectLeaks: false,
  detectOpenHandles: false,
  displayName: undefined,
  errorOnDeprecated: false,
  extraGlobals: [],
  filter: null,
  forceCoverageMatch: [],
  globalSetup: null,
  globalTeardown: null,
  globals: {},
  haste: {
    providesModuleNodeModules: [],
  },
  moduleDirectories: [],
  moduleFileExtensions: ['js'],
  moduleLoader: '/test_module_loader_path',
  moduleNameMapper: [],
  modulePathIgnorePatterns: [],
  modulePaths: [],
  name: 'test_name',
  prettierPath: 'prettier',
  resetMocks: false,
  resetModules: false,
  resolver: null,
  restoreMocks: false,
  rootDir: '/test_root_dir/',
  roots: [],
  runner: 'jest-runner',
  setupFiles: [],
  setupFilesAfterEnv: [],
  skipFilter: false,
  skipNodeResolution: false,
  snapshotResolver: null,
  snapshotSerializers: [],
  testEnvironment: 'node',
  testEnvironmentOptions: {},
  testLocationInResults: false,
  testMatch: [],
  testPathIgnorePatterns: [],
  testRegex: ['\\.test\\.js$'],
  testRunner: 'jest-jasmine2',
  testURL: '',
  timers: 'real',
  transform: [],
  transformIgnorePatterns: [],
  unmockedModulePathPatterns: null,
  watchPathIgnorePatterns: [],
};

export const makeGlobalConfig = (overrides: Object = {}): GlobalConfig => {
  const overridesKeys = new Set(Object.keys(overrides));
  Object.keys(DEFAULT_GLOBAL_CONFIG).forEach(key => overridesKeys.delete(key));

  if (overridesKeys.size > 0) {
    throw new Error(`
      Properties that are not part of GlobalConfig type were passed:
      ${JSON.stringify(Array.from(overridesKeys))}
    `);
  }

  return {...DEFAULT_GLOBAL_CONFIG, ...overrides};
};

export const makeProjectConfig = (overrides: Object = {}): ProjectConfig => {
  const overridesKeys = new Set(Object.keys(overrides));
  Object.keys(DEFAULT_PROJECT_CONFIG).forEach(key => overridesKeys.delete(key));

  if (overridesKeys.size > 0) {
    throw new Error(`
      Properties that are not part of ProjectConfig type were passed:
      ${JSON.stringify(Array.from(overridesKeys))}
    `);
  }

  return {...DEFAULT_GLOBAL_CONFIG, ...overrides};
};
