/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const os = require('os');
const path = require('path');
const chalk = require('chalk');
const NODE_MODULES = path.sep + 'node_modules' + path.sep;
const replacePathSepForRegex = (string: string) => {
  if (path.sep === '\\') {
    return string.replace(/(\/|\\(?!\.))/g, '\\\\');
  }
  return string;
};

const NODE_MODULES_REGEXP = replacePathSepForRegex(NODE_MODULES);

const defaultConfig = {
  automock: false,
  bail: 0,
  browser: false,
  cacheDirectory: path.join(os.tmpdir(), 'jest'),
  clearMocks: false,
  coveragePathIgnorePatterns: [NODE_MODULES_REGEXP],
  coverageReporters: ['json', 'text', 'lcov', 'clover'],
  expand: false,
  globals: {},
  haste: {
    providesModuleNodeModules: [],
  },
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: ['js', 'json', 'jsx', 'node'],
  moduleNameMapper: {},
  modulePathIgnorePatterns: [],
  noStackTrace: false,
  notify: false,
  notifyMode: 'failure-change',
  preset: null,
  prettierPath: 'prettier',
  prettyFormatSnapshotConfig: {
    escapeRegex: true,
    printFunctionName: false,
  },
  resetMocks: false,
  resetModules: false,
  restoreMocks: false,
  roots: ['<rootDir>'],
  snapshotSerializers: [],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [NODE_MODULES_REGEXP],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  testResultsProcessor: null,
  testURL: 'http://localhost',
  timers: 'real',
  transformIgnorePatterns: [NODE_MODULES_REGEXP],
  useStderr: false,
  verbose: null,
  watch: false,
  watchPathIgnorePatterns: [],
};

const validConfig = {
  automock: false,
  bail: 0,
  browser: false,
  cache: true,
  cacheDirectory: '/tmp/user/jest',
  clearMocks: false,
  collectCoverage: true,
  collectCoverageFrom: ['src', '!public'],
  collectCoverageOnlyFrom: {
    '<rootDir>/this-directory-is-covered/Covered.js': true,
  },
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [NODE_MODULES_REGEXP],
  coverageReporters: ['json', 'text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 50,
    },
  },
  expand: false,
  forceExit: false,
  globals: {},
  haste: {
    providesModuleNodeModules: ['react', 'react-native'],
  },
  logHeapUsage: true,
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: ['js', 'json', 'jsx', 'node'],
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
  preset: 'react-native',
  prettierPath: '<rootDir>/node_modules/prettier',
  prettyFormatSnapshotConfig: {
    escapeRegex: true,
    printFunctionName: false,
  },
  resetMocks: false,
  resetModules: false,
  restoreMocks: false,
  rootDir: '/',
  roots: ['<rootDir>'],
  setupFiles: ['<rootDir>/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/testSetupFile.js'],
  silent: true,
  snapshotSerializers: ['my-serializer-module'],
  testEnvironment: 'jest-environment-jsdom',
  testNamePattern: 'test signature',
  testPathIgnorePatterns: [NODE_MODULES_REGEXP],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  testResultsProcessor: 'processor-node-module',
  testRunner: 'jasmine2',
  testURL: 'http://localhost',
  timers: 'real',
  transform: {
    '^.+\\.js$': '<rootDir>/preprocessor.js',
  },
  transformIgnorePatterns: [NODE_MODULES_REGEXP],
  unmockedModulePathPatterns: ['mock'],
  updateSnapshot: true,
  useStderr: false,
  verbose: false,
  watch: false,
  watchPathIgnorePatterns: [],
  watchman: true,
};

const format = (value: string) => require('pretty-format')(value, { min: true });

const deprecatedConfig = {
  preprocessorIgnorePatterns: (config: Object) =>
    `  Option ${chalk.bold(
      'preprocessorIgnorePatterns',
    )} was replaced by ${chalk.bold(
      'transformIgnorePatterns',
    )}, which support multiple preprocessors.

  Jest now treats your current configuration as:
  {
    ${chalk.bold('"transformIgnorePatterns"')}: ${chalk.bold(
      `${format(config.preprocessorIgnorePatterns)}`,
    )}
  }

  Please update your configuration.`,

  scriptPreprocessor: (config: Object) =>
    `  Option ${chalk.bold('scriptPreprocessor')} was replaced by ${chalk.bold(
      'transform',
    )}, which support multiple preprocessors.

  Jest now treats your current configuration as:
  {
    ${chalk.bold('"transform"')}: ${chalk.bold(
      `{".*": ${format(config.scriptPreprocessor)}}`,
    )}
  }

  Please update your configuration.`,
};

module.exports = {
  defaultConfig,
  deprecatedConfig,
  validConfig,
};
