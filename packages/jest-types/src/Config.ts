/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Arguments} from 'yargs';
import type {ReportOptions} from 'istanbul-reports';
import chalk = require('chalk');

type CoverageProvider = 'babel' | 'v8';

export type Path = string;
export type PathID = string;
// Keeping RPth of the same length as Path for now, to keep diffs to minimum
// will rename it later.
export type RPth = {
  // the initial path as it was used before this PR
  // replace it with other properties:
  // 1. realpath - full path resolved using smth. like _getRealPath()
  // 2. filename - just the file name w/o the containing directies
  // 3. extname - just the extension (to speed up a bit)
  // 4. dirname - just the dir name (to speed up a bit)
  readonly path: string;
  // prob. the real path + the query string
  readonly id: PathID;
};

export type Glob = string;

export type HasteConfig = {
  computeSha1?: boolean;
  defaultPlatform?: string | null;
  hasteImplModulePath?: string;
  platforms?: Array<string>;
  providesModuleNodeModules: Array<string>;
  throwOnModuleCollision?: boolean;
};

export type ReporterConfig = [string, Record<string, unknown>];
export type TransformerConfig = [string, Record<string, unknown>];

export interface ConfigGlobals {
  [K: string]: unknown;
}

export type DefaultOptions = {
  automock: boolean;
  bail: number;
  browser: boolean;
  cache: boolean;
  cacheDirectory: Path;
  changedFilesWithAncestor: boolean;
  clearMocks: boolean;
  collectCoverage: boolean;
  coveragePathIgnorePatterns: Array<string>;
  coverageReporters: Array<string | [string, any]>;
  coverageProvider: CoverageProvider;
  errorOnDeprecated: boolean;
  expand: boolean;
  forceCoverageMatch: Array<Glob>;
  globals: ConfigGlobals;
  haste: HasteConfig;
  maxConcurrency: number;
  maxWorkers: number | string;
  moduleDirectories: Array<string>;
  moduleFileExtensions: Array<string>;
  moduleNameMapper: Record<string, string | Array<string>>;
  modulePathIgnorePatterns: Array<string>;
  noStackTrace: boolean;
  notify: boolean;
  notifyMode: NotifyMode;
  prettierPath: string;
  resetMocks: boolean;
  resetModules: boolean;
  restoreMocks: boolean;
  roots: Array<Path>;
  runTestsByPath: boolean;
  runner: 'jest-runner';
  setupFiles: Array<Path>;
  setupFilesAfterEnv: Array<Path>;
  skipFilter: boolean;
  snapshotSerializers: Array<Path>;
  testEnvironment: string;
  testEnvironmentOptions: Record<string, any>;
  testFailureExitCode: string | number;
  testLocationInResults: boolean;
  testMatch: Array<Glob>;
  testPathIgnorePatterns: Array<string>;
  testRegex: Array<string>;
  testRunner: string;
  testSequencer: string;
  testURL: string;
  timers: 'real' | 'fake';
  transformIgnorePatterns: Array<Glob>;
  useStderr: boolean;
  watch: boolean;
  watchPathIgnorePatterns: Array<string>;
  watchman: boolean;
};

export type DisplayName =
  | string
  | {
      name: string;
      color: typeof chalk.Color;
    };

export type InitialOptionsWithRootDir = InitialOptions &
  Required<Pick<InitialOptions, 'rootDir'>>;

export type InitialOptions = Partial<{
  automock: boolean;
  bail: boolean | number;
  browser: boolean;
  cache: boolean;
  cacheDirectory: Path;
  clearMocks: boolean;
  changedFilesWithAncestor: boolean;
  changedSince: string;
  collectCoverage: boolean;
  collectCoverageFrom: Array<Glob>;
  collectCoverageOnlyFrom: {
    [key: string]: boolean;
  };
  coverageDirectory: string;
  coveragePathIgnorePatterns: Array<string>;
  coverageProvider: CoverageProvider;
  coverageReporters: Array<string>;
  coverageThreshold: {
    global: {
      [key: string]: number;
    };
  };
  dependencyExtractor: string;
  detectLeaks: boolean;
  detectOpenHandles: boolean;
  displayName: DisplayName;
  expand: boolean;
  extraGlobals: Array<string>;
  filter: Path;
  findRelatedTests: boolean;
  forceCoverageMatch: Array<Glob>;
  forceExit: boolean;
  json: boolean;
  globals: ConfigGlobals;
  globalSetup: string | null | undefined;
  globalTeardown: string | null | undefined;
  haste: HasteConfig;
  reporters: Array<string | ReporterConfig>;
  logHeapUsage: boolean;
  lastCommit: boolean;
  listTests: boolean;
  mapCoverage: boolean;
  maxConcurrency: number;
  maxWorkers: number | string;
  moduleDirectories: Array<string>;
  moduleFileExtensions: Array<string>;
  moduleLoader: Path;
  moduleNameMapper: {
    [key: string]: string | Array<string>;
  };
  modulePathIgnorePatterns: Array<string>;
  modulePaths: Array<string>;
  name: string;
  noStackTrace: boolean;
  notify: boolean;
  notifyMode: string;
  onlyChanged: boolean;
  outputFile: Path;
  passWithNoTests: boolean;
  preprocessorIgnorePatterns: Array<Glob>;
  preset: string | null | undefined;
  prettierPath: string | null | undefined;
  projects: Array<Glob>;
  replname: string | null | undefined;
  resetMocks: boolean;
  resetModules: boolean;
  resolver: Path | null | undefined;
  restoreMocks: boolean;
  rootDir: Path;
  roots: Array<Path>;
  runner: string;
  runTestsByPath: boolean;
  scriptPreprocessor: string;
  setupFiles: Array<Path>;
  setupTestFrameworkScriptFile: Path;
  setupFilesAfterEnv: Array<Path>;
  silent: boolean;
  skipFilter: boolean;
  skipNodeResolution: boolean;
  snapshotResolver: Path;
  snapshotSerializers: Array<Path>;
  errorOnDeprecated: boolean;
  testEnvironment: string;
  testEnvironmentOptions: Record<string, any>;
  testFailureExitCode: string | number;
  testLocationInResults: boolean;
  testMatch: Array<Glob>;
  testNamePattern: string;
  testPathDirs: Array<Path>;
  testPathIgnorePatterns: Array<string>;
  testRegex: string | Array<string>;
  testResultsProcessor: string;
  testRunner: string;
  testSequencer: string;
  testURL: string;
  testTimeout: number;
  timers: 'real' | 'fake';
  transform: {
    [regex: string]: Path | TransformerConfig;
  };
  transformIgnorePatterns: Array<Glob>;
  watchPathIgnorePatterns: Array<string>;
  unmockedModulePathPatterns: Array<string>;
  updateSnapshot: boolean;
  useStderr: boolean;
  verbose?: boolean;
  watch: boolean;
  watchAll: boolean;
  watchman: boolean;
  watchPlugins: Array<string | [string, Record<string, any>]>;
}>;

export type SnapshotUpdateState = 'all' | 'new' | 'none';

type NotifyMode =
  | 'always'
  | 'failure'
  | 'success'
  | 'change'
  | 'success-change'
  | 'failure-change';

export type CoverageThresholdValue = {
  branches?: number;
  functions?: number;
  lines?: number;
  statements?: number;
};

type CoverageThreshold = {
  [path: string]: CoverageThresholdValue;
  global: CoverageThresholdValue;
};

export type GlobalConfig = {
  bail: number;
  changedSince?: string;
  changedFilesWithAncestor: boolean;
  collectCoverage: boolean;
  collectCoverageFrom: Array<Glob>;
  collectCoverageOnlyFrom?: {
    [key: string]: boolean;
  };
  coverageDirectory: string;
  coveragePathIgnorePatterns?: Array<string>;
  coverageProvider: CoverageProvider;
  coverageReporters: Array<keyof ReportOptions | [keyof ReportOptions, any]>;
  coverageThreshold?: CoverageThreshold;
  detectLeaks: boolean;
  detectOpenHandles: boolean;
  enabledTestsMap?: {
    [key: string]: {
      [key: string]: boolean;
    };
  };
  expand: boolean;
  filter?: Path;
  findRelatedTests: boolean;
  forceExit: boolean;
  json: boolean;
  globalSetup?: string;
  globalTeardown?: string;
  lastCommit: boolean;
  logHeapUsage: boolean;
  listTests: boolean;
  maxConcurrency: number;
  maxWorkers: number;
  noStackTrace: boolean;
  nonFlagArgs: Array<string>;
  noSCM?: boolean;
  notify: boolean;
  notifyMode: NotifyMode;
  outputFile?: Path;
  onlyChanged: boolean;
  onlyFailures: boolean;
  passWithNoTests: boolean;
  projects: Array<Glob>;
  replname?: string;
  reporters?: Array<string | ReporterConfig>;
  runTestsByPath: boolean;
  rootDir: Path;
  silent?: boolean;
  skipFilter: boolean;
  errorOnDeprecated: boolean;
  testFailureExitCode: number;
  testNamePattern?: string;
  testPathPattern: string;
  testResultsProcessor?: string;
  testSequencer: string;
  testTimeout?: number;
  updateSnapshot: SnapshotUpdateState;
  useStderr: boolean;
  verbose?: boolean;
  watch: boolean;
  watchAll: boolean;
  watchman: boolean;
  watchPlugins?: Array<{
    path: string;
    config: Record<string, any>;
  }> | null;
};

export type ProjectConfig = {
  automock: boolean;
  browser: boolean;
  cache: boolean;
  cacheDirectory: Path;
  clearMocks: boolean;
  coveragePathIgnorePatterns: Array<string>;
  cwd: Path;
  dependencyExtractor?: string;
  detectLeaks: boolean;
  detectOpenHandles: boolean;
  displayName?: DisplayName;
  errorOnDeprecated: boolean;
  extraGlobals: Array<keyof NodeJS.Global>;
  filter?: Path;
  forceCoverageMatch: Array<Glob>;
  globalSetup?: string;
  globalTeardown?: string;
  globals: ConfigGlobals;
  haste: HasteConfig;
  moduleDirectories: Array<string>;
  moduleFileExtensions: Array<string>;
  moduleLoader?: Path;
  moduleNameMapper: Array<[string, string]>;
  modulePathIgnorePatterns: Array<string>;
  modulePaths?: Array<string>;
  name: string;
  prettierPath: string;
  resetMocks: boolean;
  resetModules: boolean;
  resolver?: Path;
  restoreMocks: boolean;
  rootDir: Path;
  roots: Array<Path>;
  runner: string;
  setupFiles: Array<Path>;
  setupFilesAfterEnv: Array<Path>;
  skipFilter: boolean;
  skipNodeResolution?: boolean;
  snapshotResolver?: Path;
  snapshotSerializers: Array<Path>;
  testEnvironment: string;
  testEnvironmentOptions: Record<string, any>;
  testMatch: Array<Glob>;
  testLocationInResults: boolean;
  testPathIgnorePatterns: Array<string>;
  testRegex: Array<string>;
  testRunner: string;
  testURL: string;
  timers: 'real' | 'fake';
  transform: Array<[string, Path, Record<string, unknown>]>;
  transformIgnorePatterns: Array<Glob>;
  watchPathIgnorePatterns: Array<string>;
  unmockedModulePathPatterns?: Array<string>;
};

export type Argv = Arguments<
  Partial<{
    all: boolean;
    automock: boolean;
    bail: boolean | number;
    browser: boolean;
    cache: boolean;
    cacheDirectory: string;
    changedFilesWithAncestor: boolean;
    changedSince: string;
    ci: boolean;
    clearCache: boolean;
    clearMocks: boolean;
    collectCoverage: boolean;
    collectCoverageFrom: string;
    collectCoverageOnlyFrom: Array<string>;
    color: boolean;
    colors: boolean;
    config: string;
    coverage: boolean;
    coverageDirectory: string;
    coveragePathIgnorePatterns: Array<string>;
    coverageReporters: Array<string>;
    coverageThreshold: string;
    debug: boolean;
    env: string;
    expand: boolean;
    findRelatedTests: boolean;
    forceExit: boolean;
    globals: string;
    globalSetup: string | null | undefined;
    globalTeardown: string | null | undefined;
    haste: string;
    init: boolean;
    json: boolean;
    lastCommit: boolean;
    logHeapUsage: boolean;
    maxWorkers: number | string;
    moduleDirectories: Array<string>;
    moduleFileExtensions: Array<string>;
    moduleNameMapper: string;
    modulePathIgnorePatterns: Array<string>;
    modulePaths: Array<string>;
    noStackTrace: boolean;
    notify: boolean;
    notifyMode: string;
    onlyChanged: boolean;
    outputFile: string;
    preset: string | null | undefined;
    projects: Array<string>;
    prettierPath: string | null | undefined;
    resetMocks: boolean;
    resetModules: boolean;
    resolver: string | null | undefined;
    restoreMocks: boolean;
    rootDir: string;
    roots: Array<string>;
    runInBand: boolean;
    setupFiles: Array<string>;
    setupFilesAfterEnv: Array<string>;
    showConfig: boolean;
    silent: boolean;
    snapshotSerializers: Array<string>;
    testEnvironment: string;
    testFailureExitCode: string | null | undefined;
    testMatch: Array<string>;
    testNamePattern: string;
    testPathIgnorePatterns: Array<string>;
    testPathPattern: Array<string>;
    testRegex: string | Array<string>;
    testResultsProcessor: string;
    testRunner: string;
    testSequencer: string;
    testURL: string;
    testTimeout: number | null | undefined;
    timers: string;
    transform: string;
    transformIgnorePatterns: Array<string>;
    unmockedModulePathPatterns: Array<string> | null | undefined;
    updateSnapshot: boolean;
    useStderr: boolean;
    verbose: boolean;
    version: boolean;
    watch: boolean;
    watchAll: boolean;
    watchman: boolean;
    watchPathIgnorePatterns: Array<string>;
  }>
>;
