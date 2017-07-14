/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

export type Path = string;
export type Glob = string;

export type HasteConfig = {|
  defaultPlatform?: ?string,
  hasteImplModulePath?: string,
  platforms?: Array<string>,
  providesModuleNodeModules: Array<string>,
|};

export type ReporterConfig = [string, Object];

export type ConfigGlobals = Object;

export type DefaultOptions = {|
  automock: boolean,
  bail: boolean,
  browser: boolean,
  cache: boolean,
  cacheDirectory: Path,
  clearMocks: boolean,
  coveragePathIgnorePatterns: Array<string>,
  coverageReporters: Array<string>,
  expand: boolean,
  globals: ConfigGlobals,
  haste: HasteConfig,
  mapCoverage: boolean,
  moduleDirectories: Array<string>,
  moduleFileExtensions: Array<string>,
  moduleNameMapper: {[key: string]: string},
  modulePathIgnorePatterns: Array<string>,
  noStackTrace: boolean,
  notify: boolean,
  preset: ?string,
  resetMocks: boolean,
  resetModules: boolean,
  snapshotSerializers: Array<Path>,
  testEnvironment: string,
  testMatch: Array<Glob>,
  testPathIgnorePatterns: Array<string>,
  testRegex: string,
  testResultsProcessor: ?string,
  testURL: string,
  timers: 'real' | 'fake',
  transformIgnorePatterns: Array<Glob>,
  useStderr: boolean,
  verbose: ?boolean,
  watch: boolean,
  watchman: boolean,
|};

export type InitialOptions = {|
  automock?: boolean,
  bail?: boolean,
  browser?: boolean,
  cache?: boolean,
  cacheDirectory?: Path,
  clearMocks?: boolean,
  collectCoverage?: boolean,
  collectCoverageFrom?: Array<Glob>,
  collectCoverageOnlyFrom?: {[key: string]: boolean},
  coverageDirectory?: string,
  coveragePathIgnorePatterns?: Array<string>,
  coverageReporters?: Array<string>,
  coverageThreshold?: {global: {[key: string]: number}},
  expand?: boolean,
  forceExit?: boolean,
  json: boolean,
  globals?: ConfigGlobals,
  haste?: HasteConfig,
  reporters?: Array<ReporterConfig | string>,
  logHeapUsage?: boolean,
  listTests?: boolean,
  mapCoverage?: boolean,
  moduleDirectories?: Array<string>,
  moduleFileExtensions?: Array<string>,
  moduleLoader?: Path,
  moduleNameMapper?: {[key: string]: string},
  modulePathIgnorePatterns?: Array<string>,
  modulePaths?: Array<string>,
  name?: string,
  noStackTrace?: boolean,
  notify?: boolean,
  onlyChanged?: boolean,
  outputFile?: Path,
  preprocessorIgnorePatterns?: Array<Glob>,
  preset?: ?string,
  projects: ?Array<Glob>,
  replname?: ?string,
  resetMocks?: boolean,
  resetModules?: boolean,
  resolver?: ?Path,
  rootDir: Path,
  roots?: Array<Path>,
  scriptPreprocessor?: string,
  setupFiles?: Array<Path>,
  setupTestFrameworkScriptFile?: Path,
  silent?: boolean,
  skipNodeResolution: boolean,
  snapshotSerializers?: Array<Path>,
  testEnvironment?: string,
  testMatch?: Array<Glob>,
  testNamePattern?: string,
  testPathIgnorePatterns?: Array<string>,
  testRegex?: string,
  testResultsProcessor?: ?string,
  testRunner?: string,
  testURL?: string,
  timers?: 'real' | 'fake',
  transform?: {[key: string]: string},
  transformIgnorePatterns?: Array<Glob>,
  unmockedModulePathPatterns?: Array<string>,
  updateSnapshot?: boolean,
  useStderr?: boolean,
  verbose?: ?boolean,
  watch?: boolean,
  watchAll?: boolean,
  watchman?: boolean,
|};

export type SnapshotUpdateState = 'all' | 'new' | 'none';

export type GlobalConfig = {|
  bail: boolean,
  collectCoverage: boolean,
  collectCoverageFrom: Array<Glob>,
  collectCoverageOnlyFrom: ?{[key: string]: boolean},
  coverageDirectory: string,
  coverageReporters: Array<string>,
  coverageThreshold: {global: {[key: string]: number}},
  expand: boolean,
  forceExit: boolean,
  json: boolean,
  lastCommit: boolean,
  logHeapUsage: boolean,
  listTests: boolean,
  mapCoverage: boolean,
  maxWorkers: number,
  noStackTrace: boolean,
  nonFlagArgs: Array<string>,
  noSCM: ?boolean,
  notify: boolean,
  outputFile: ?Path,
  onlyChanged: boolean,
  projects: Array<Glob>,
  replname: ?string,
  reporters: Array<ReporterConfig>,
  rootDir: Path,
  silent: boolean,
  testNamePattern: string,
  testPathPattern: string,
  testResultsProcessor: ?string,
  updateSnapshot: SnapshotUpdateState,
  useStderr: boolean,
  verbose: ?boolean,
  watch: boolean,
  watchAll: boolean,
  watchman: boolean,
|};

export type ProjectConfig = {|
  automock: boolean,
  browser: boolean,
  cache: boolean,
  cacheDirectory: Path,
  clearMocks: boolean,
  coveragePathIgnorePatterns: Array<string>,
  globals: ConfigGlobals,
  haste: HasteConfig,
  moduleDirectories: Array<string>,
  moduleFileExtensions: Array<string>,
  moduleLoader: Path,
  moduleNameMapper: Array<[string, string]>,
  modulePathIgnorePatterns: Array<string>,
  modulePaths: Array<string>,
  name: string,
  resetMocks: boolean,
  resetModules: boolean,
  resolver: ?Path,
  rootDir: Path,
  roots: Array<Path>,
  setupFiles: Array<Path>,
  setupTestFrameworkScriptFile: Path,
  skipNodeResolution: boolean,
  snapshotSerializers: Array<Path>,
  testEnvironment: string,
  testMatch: Array<Glob>,
  testPathIgnorePatterns: Array<string>,
  testRegex: string,
  testRunner: string,
  testURL: string,
  timers: 'real' | 'fake',
  transform: Array<[string, Path]>,
  transformIgnorePatterns: Array<Glob>,
  unmockedModulePathPatterns: ?Array<string>,
|};
