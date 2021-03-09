/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Config} from '@jest/types';

const DEFAULT_GLOBAL_CONFIG: Config.GlobalConfig = {
  bail: 0,
  changedFilesWithAncestor: false,
  changedSince: '',
  collectCoverage: false,
  collectCoverageFrom: [],
  collectCoverageOnlyFrom: undefined,
  coverageDirectory: 'coverage',
  coverageProvider: 'babel',
  coverageReporters: [],
  coverageThreshold: {global: {}},
  detectLeaks: false,
  detectOpenHandles: false,
  errorOnDeprecated: false,
  expand: false,
  filter: undefined,
  findRelatedTests: false,
  forceExit: false,
  globalSetup: undefined,
  globalTeardown: undefined,
  json: false,
  lastCommit: false,
  listTests: false,
  logHeapUsage: false,
  maxConcurrency: 5,
  maxWorkers: 2,
  noSCM: undefined,
  noStackTrace: false,
  nonFlagArgs: [],
  notify: false,
  notifyMode: 'failure-change',
  onlyChanged: false,
  onlyFailures: false,
  outputFile: undefined,
  passWithNoTests: false,
  projects: [],
  replname: undefined,
  reporters: [],
  rootDir: '/test_root_dir/',
  runTestsByPath: false,
  silent: false,
  skipFilter: false,
  testFailureExitCode: 1,
  testNamePattern: '',
  testPathPattern: '',
  testResultsProcessor: undefined,
  testSequencer: '@jest/test-sequencer',
  testTimeout: 5000,
  updateSnapshot: 'none',
  useStderr: false,
  verbose: false,
  watch: false,
  watchAll: false,
  watchPlugins: [],
  watchman: false,
};

const DEFAULT_PROJECT_CONFIG: Config.ProjectConfig = {
  automock: false,
  cache: false,
  cacheDirectory: '/test_cache_dir/',
  clearMocks: false,
  coveragePathIgnorePatterns: [],
  cwd: '/test_root_dir/',
  detectLeaks: false,
  detectOpenHandles: false,
  displayName: undefined,
  errorOnDeprecated: false,
  extensionsToTreatAsEsm: [],
  extraGlobals: [],
  filter: undefined,
  forceCoverageMatch: [],
  globalSetup: undefined,
  globalTeardown: undefined,
  globals: {},
  haste: {},
  id: 'test_name',
  injectGlobals: true,
  moduleDirectories: [],
  moduleFileExtensions: ['js'],
  moduleLoader: '/test_module_loader_path',
  moduleNameMapper: [],
  modulePathIgnorePatterns: [],
  modulePaths: [],
  prettierPath: 'prettier',
  resetMocks: false,
  resetModules: false,
  resolver: undefined,
  restoreMocks: false,
  rootDir: '/test_root_dir/',
  roots: [],
  runner: 'jest-runner',
  setupFiles: [],
  setupFilesAfterEnv: [],
  skipFilter: false,
  skipNodeResolution: false,
  slowTestThreshold: 5,
  snapshotResolver: undefined,
  snapshotSerializers: [],
  testEnvironment: 'node',
  testEnvironmentOptions: {},
  testLocationInResults: false,
  testMatch: [],
  testPathIgnorePatterns: [],
  testRegex: ['\\.test\\.js$'],
  testRunner: 'jest-circus/runner',
  testURL: 'http://localhost',
  timers: 'real',
  transform: [],
  transformIgnorePatterns: [],
  unmockedModulePathPatterns: undefined,
  watchPathIgnorePatterns: [],
};

export const makeGlobalConfig = (
  overrides: Partial<Config.GlobalConfig> = {},
): Config.GlobalConfig => {
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

export const makeProjectConfig = (
  overrides: Partial<Config.ProjectConfig> = {},
): Config.ProjectConfig => {
  const overridesKeys = new Set(Object.keys(overrides));
  Object.keys(DEFAULT_PROJECT_CONFIG).forEach(key => overridesKeys.delete(key));

  if (overridesKeys.size > 0) {
    throw new Error(`
      Properties that are not part of ProjectConfig type were passed:
      ${JSON.stringify(Array.from(overridesKeys))}
    `);
  }

  return {...DEFAULT_PROJECT_CONFIG, ...overrides};
};
