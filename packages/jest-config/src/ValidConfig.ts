/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Config} from '@jest/types';
import {replacePathSepForRegex} from 'jest-regex-util';
import {multipleValidOptions} from 'jest-validate';
import {DEFAULT_OPTIONS as PRETTY_FORMAT_DEFAULTS} from 'pretty-format';
import {NODE_MODULES} from './constants';

const NODE_MODULES_REGEXP = replacePathSepForRegex(NODE_MODULES);

const initialOptions: Config.InitialOptions = {
  automock: false,
  bail: multipleValidOptions(false, 0),
  cache: true,
  cacheDirectory: '/tmp/user/jest',
  changedFilesWithAncestor: false,
  changedSince: 'master',
  ci: false,
  clearMocks: false,
  collectCoverage: true,
  collectCoverageFrom: ['src', '!public'],
  collectCoverageOnlyFrom: {
    '<rootDir>/this-directory-is-covered/Covered.js': true,
  },
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [NODE_MODULES_REGEXP],
  coverageProvider: 'v8',
  coverageReporters: ['json', 'text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  dependencyExtractor: '<rootDir>/dependencyExtractor.js',
  detectLeaks: false,
  detectOpenHandles: false,
  displayName: multipleValidOptions('test-config', {
    color: 'blue',
    name: 'test-config',
  } as const),
  errorOnDeprecated: false,
  expand: false,
  extensionsToTreatAsEsm: [],
  extraGlobals: [],
  filter: '<rootDir>/filter.js',
  forceCoverageMatch: ['**/*.t.js'],
  forceExit: false,
  globalSetup: 'setup.js',
  globalTeardown: 'teardown.js',
  globals: {__DEV__: true},
  haste: {
    computeSha1: true,
    defaultPlatform: 'ios',
    enableSymlinks: false,
    forceNodeFilesystemAPI: false,
    hasteImplModulePath: '<rootDir>/haste_impl.js',
    hasteMapModulePath: '',
    platforms: ['ios', 'android'],
    throwOnModuleCollision: false,
  },
  injectGlobals: true,
  inlineSnapshotFormat: PRETTY_FORMAT_DEFAULTS,
  json: false,
  lastCommit: false,
  listTests: false,
  logHeapUsage: true,
  maxConcurrency: 5,
  maxWorkers: '50%',
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  moduleLoader: '<rootDir>',
  moduleNameMapper: {
    '^React$': '<rootDir>/node_modules/react',
  },
  modulePathIgnorePatterns: ['<rootDir>/build/'],
  modulePaths: ['/shared/vendor/modules'],
  name: 'string',
  noStackTrace: false,
  notify: false,
  notifyMode: 'failure-change',
  onlyChanged: false,
  onlyFailures: false,
  passWithNoTests: false,
  preset: 'react-native',
  prettierPath: '<rootDir>/node_modules/prettier',
  projects: ['project-a', 'project-b/'],
  reporters: [
    'default',
    'custom-reporter-1',
    ['custom-reporter-2', {configValue: true}],
  ],
  resetMocks: false,
  resetModules: false,
  resolver: '<rootDir>/resolver.js',
  restoreMocks: false,
  rootDir: '/',
  roots: ['<rootDir>'],
  runTestsByPath: false,
  runner: 'jest-runner',
  setupFiles: ['<rootDir>/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/testSetupFile.js'],
  silent: true,
  skipFilter: false,
  skipNodeResolution: false,
  slowTestThreshold: 5,
  snapshotFormat: PRETTY_FORMAT_DEFAULTS,
  snapshotResolver: '<rootDir>/snapshotResolver.js',
  snapshotSerializers: ['my-serializer-module'],
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {userAgent: 'Agent/007'},
  testFailureExitCode: 1,
  testLocationInResults: false,
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testNamePattern: 'test signature',
  testPathIgnorePatterns: [NODE_MODULES_REGEXP],
  testRegex: multipleValidOptions(
    '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
    ['/__tests__/\\.test\\.[jt]sx?$', '/__tests__/\\.spec\\.[jt]sx?$'],
  ),
  testResultsProcessor: 'processor-node-module',
  testRunner: 'circus',
  testSequencer: '@jest/test-sequencer',
  testTimeout: 5000,
  testURL: 'http://localhost',
  timers: 'real',
  transform: {
    '\\.js$': '<rootDir>/preprocessor.js',
  },
  transformIgnorePatterns: [NODE_MODULES_REGEXP],
  unmockedModulePathPatterns: ['mock'],
  updateSnapshot: true,
  useStderr: false,
  verbose: false,
  watch: false,
  watchAll: false,
  watchPathIgnorePatterns: ['<rootDir>/e2e/'],
  watchPlugins: [
    'path/to/yourWatchPlugin',
    [
      'jest-watch-typeahead/filename',
      {
        key: 'k',
        prompt: 'do something with my custom prompt',
      },
    ],
  ],
  watchman: true,
};

export default initialOptions;
