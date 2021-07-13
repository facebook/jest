/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import chalk = require('chalk');
import * as fs from 'graceful-fs';
import type {Config} from '@jest/types';
import {tryRealpath} from 'jest-util';
import * as constants from './constants';
import normalize from './normalize';
import readConfigFileAndSetRootDir from './readConfigFileAndSetRootDir';
import resolveConfigPath from './resolveConfigPath';
import {isJSONString, replaceRootDirInPath} from './utils';

// TODO: remove export in Jest 28
export {resolveTestEnvironment as getTestEnvironment} from 'jest-resolve';

export {isJSONString} from './utils';
export {default as normalize} from './normalize';
export {default as deprecationEntries} from './Deprecated';
export {replaceRootDirInPath} from './utils';
export {default as defaults} from './Defaults';
export {default as descriptions} from './Descriptions';
export {constants};

type ReadConfig = {
  configPath: Config.Path | null | undefined;
  globalConfig: Config.GlobalConfig;
  hasDeprecationWarnings: boolean;
  projectConfig: Config.ProjectConfig;
};

export async function readConfig(
  argv: Config.Argv,
  packageRootOrConfig: Config.Path | Config.InitialOptions,
  // Whether it needs to look into `--config` arg passed to CLI.
  // It only used to read initial config. If the initial config contains
  // `project` property, we don't want to read `--config` value and rather
  // read individual configs for every project.
  skipArgvConfigOption?: boolean,
  parentConfigDirname?: Config.Path | null,
  projectIndex: number = Infinity,
): Promise<ReadConfig> {
  let rawOptions: Config.InitialOptions;
  let configPath = null;

  if (typeof packageRootOrConfig !== 'string') {
    if (parentConfigDirname) {
      rawOptions = packageRootOrConfig;
      rawOptions.rootDir = rawOptions.rootDir
        ? replaceRootDirInPath(parentConfigDirname, rawOptions.rootDir)
        : parentConfigDirname;
    } else {
      throw new Error(
        'Jest: Cannot use configuration as an object without a file path.',
      );
    }
  } else if (isJSONString(argv.config)) {
    // A JSON string was passed to `--config` argument and we can parse it
    // and use as is.
    let config;
    try {
      config = JSON.parse(argv.config);
    } catch {
      throw new Error(
        'There was an error while parsing the `--config` argument as a JSON string.',
      );
    }

    // NOTE: we might need to resolve this dir to an absolute path in the future
    config.rootDir = config.rootDir || packageRootOrConfig;
    rawOptions = config;
    // A string passed to `--config`, which is either a direct path to the config
    // or a path to directory containing `package.json`, `jest.config.js` or `jest.config.ts`
  } else if (!skipArgvConfigOption && typeof argv.config == 'string') {
    configPath = resolveConfigPath(argv.config, process.cwd());
    rawOptions = await readConfigFileAndSetRootDir(configPath);
  } else {
    // Otherwise just try to find config in the current rootDir.
    configPath = resolveConfigPath(packageRootOrConfig, process.cwd());
    rawOptions = await readConfigFileAndSetRootDir(configPath);
  }

  const {options, hasDeprecationWarnings} = await normalize(
    rawOptions,
    argv,
    configPath,
    projectIndex,
  );

  const {globalConfig, projectConfig} = groupOptions(options);
  return {
    configPath,
    globalConfig,
    hasDeprecationWarnings,
    projectConfig,
  };
}

const groupOptions = (
  options: Config.ProjectConfig & Config.GlobalConfig,
): {
  globalConfig: Config.GlobalConfig;
  projectConfig: Config.ProjectConfig;
} => ({
  globalConfig: Object.freeze({
    bail: options.bail,
    changedFilesWithAncestor: options.changedFilesWithAncestor,
    changedSince: options.changedSince,
    collectCoverage: options.collectCoverage,
    collectCoverageFrom: options.collectCoverageFrom,
    collectCoverageOnlyFrom: options.collectCoverageOnlyFrom,
    coverageDirectory: options.coverageDirectory,
    coverageProvider: options.coverageProvider,
    coverageReporters: options.coverageReporters,
    coverageThreshold: options.coverageThreshold,
    detectLeaks: options.detectLeaks,
    detectOpenHandles: options.detectOpenHandles,
    errorOnDeprecated: options.errorOnDeprecated,
    expand: options.expand,
    filter: options.filter,
    findRelatedTests: options.findRelatedTests,
    forceExit: options.forceExit,
    globalSetup: options.globalSetup,
    globalTeardown: options.globalTeardown,
    inlineSnapshotFormat: options.inlineSnapshotFormat,
    json: options.json,
    lastCommit: options.lastCommit,
    listTests: options.listTests,
    logHeapUsage: options.logHeapUsage,
    maxConcurrency: options.maxConcurrency,
    maxWorkers: options.maxWorkers,
    noSCM: undefined,
    noStackTrace: options.noStackTrace,
    nonFlagArgs: options.nonFlagArgs,
    notify: options.notify,
    notifyMode: options.notifyMode,
    onlyChanged: options.onlyChanged,
    onlyFailures: options.onlyFailures,
    outputFile: options.outputFile,
    passWithNoTests: options.passWithNoTests,
    projects: options.projects,
    replname: options.replname,
    reporters: options.reporters,
    rootDir: options.rootDir,
    runTestsByPath: options.runTestsByPath,
    silent: options.silent,
    skipFilter: options.skipFilter,
    snapshotFormat: options.snapshotFormat,
    testFailureExitCode: options.testFailureExitCode,
    testNamePattern: options.testNamePattern,
    testPathPattern: options.testPathPattern,
    testResultsProcessor: options.testResultsProcessor,
    testSequencer: options.testSequencer,
    testTimeout: options.testTimeout,
    updateSnapshot: options.updateSnapshot,
    useStderr: options.useStderr,
    verbose: options.verbose,
    watch: options.watch,
    watchAll: options.watchAll,
    watchPlugins: options.watchPlugins,
    watchman: options.watchman,
  }),
  projectConfig: Object.freeze({
    automock: options.automock,
    cache: options.cache,
    cacheDirectory: options.cacheDirectory,
    clearMocks: options.clearMocks,
    coveragePathIgnorePatterns: options.coveragePathIgnorePatterns,
    cwd: options.cwd,
    dependencyExtractor: options.dependencyExtractor,
    detectLeaks: options.detectLeaks,
    detectOpenHandles: options.detectOpenHandles,
    displayName: options.displayName,
    errorOnDeprecated: options.errorOnDeprecated,
    extensionsToTreatAsEsm: options.extensionsToTreatAsEsm,
    extraGlobals: options.extraGlobals,
    filter: options.filter,
    forceCoverageMatch: options.forceCoverageMatch,
    globalSetup: options.globalSetup,
    globalTeardown: options.globalTeardown,
    globals: options.globals,
    haste: options.haste,
    injectGlobals: options.injectGlobals,
    inlineSnapshotFormat: options.inlineSnapshotFormat,
    moduleDirectories: options.moduleDirectories,
    moduleFileExtensions: options.moduleFileExtensions,
    moduleLoader: options.moduleLoader,
    moduleNameMapper: options.moduleNameMapper,
    modulePathIgnorePatterns: options.modulePathIgnorePatterns,
    modulePaths: options.modulePaths,
    name: options.name,
    prettierPath: options.prettierPath,
    resetMocks: options.resetMocks,
    resetModules: options.resetModules,
    resolver: options.resolver,
    restoreMocks: options.restoreMocks,
    rootDir: options.rootDir,
    roots: options.roots,
    runner: options.runner,
    setupFiles: options.setupFiles,
    setupFilesAfterEnv: options.setupFilesAfterEnv,
    skipFilter: options.skipFilter,
    skipNodeResolution: options.skipNodeResolution,
    slowTestThreshold: options.slowTestThreshold,
    snapshotFormat: options.snapshotFormat,
    snapshotResolver: options.snapshotResolver,
    snapshotSerializers: options.snapshotSerializers,
    testEnvironment: options.testEnvironment,
    testEnvironmentOptions: options.testEnvironmentOptions,
    testLocationInResults: options.testLocationInResults,
    testMatch: options.testMatch,
    testPathIgnorePatterns: options.testPathIgnorePatterns,
    testRegex: options.testRegex,
    testRunner: options.testRunner,
    testURL: options.testURL,
    timers: options.timers,
    transform: options.transform,
    transformIgnorePatterns: options.transformIgnorePatterns,
    unmockedModulePathPatterns: options.unmockedModulePathPatterns,
    watchPathIgnorePatterns: options.watchPathIgnorePatterns,
  }),
});

const ensureNoDuplicateConfigs = (
  parsedConfigs: Array<ReadConfig>,
  projects: Config.GlobalConfig['projects'],
) => {
  if (projects.length <= 1) {
    return;
  }

  const configPathMap = new Map();

  for (const config of parsedConfigs) {
    const {configPath} = config;

    if (configPathMap.has(configPath)) {
      const message = `Whoops! Two projects resolved to the same config path: ${chalk.bold(
        String(configPath),
      )}:

  Project 1: ${chalk.bold(projects[parsedConfigs.findIndex(x => x === config)])}
  Project 2: ${chalk.bold(
    projects[parsedConfigs.findIndex(x => x === configPathMap.get(configPath))],
  )}

This usually means that your ${chalk.bold(
        '"projects"',
      )} config includes a directory that doesn't have any configuration recognizable by Jest. Please fix it.
`;

      throw new Error(message);
    }
    if (configPath !== null) {
      configPathMap.set(configPath, config);
    }
  }
};

// Possible scenarios:
//  1. jest --config config.json
//  2. jest --projects p1 p2
//  3. jest --projects p1 p2 --config config.json
//  4. jest --projects p1
//  5. jest
//
// If no projects are specified, process.cwd() will be used as the default
// (and only) project.
export async function readConfigs(
  argv: Config.Argv,
  projectPaths: Array<Config.Path>,
): Promise<{
  globalConfig: Config.GlobalConfig;
  configs: Array<Config.ProjectConfig>;
  hasDeprecationWarnings: boolean;
}> {
  let globalConfig;
  let hasDeprecationWarnings;
  let configs: Array<Config.ProjectConfig> = [];
  let projects = projectPaths;
  let configPath: Config.Path | null | undefined;

  if (projectPaths.length === 1) {
    const parsedConfig = await readConfig(argv, projects[0]);
    configPath = parsedConfig.configPath;

    hasDeprecationWarnings = parsedConfig.hasDeprecationWarnings;
    globalConfig = parsedConfig.globalConfig;
    configs = [parsedConfig.projectConfig];
    if (globalConfig.projects && globalConfig.projects.length) {
      // Even though we had one project in CLI args, there might be more
      // projects defined in the config.
      // In other words, if this was a single project,
      // and its config has `projects` settings, use that value instead.
      projects = globalConfig.projects;
    }
  }

  if (projects.length > 0) {
    const cwd =
      process.platform === 'win32' ? tryRealpath(process.cwd()) : process.cwd();
    const projectIsCwd = projects[0] === cwd;

    const parsedConfigs = await Promise.all(
      projects
        .filter(root => {
          // Ignore globbed files that cannot be `require`d.
          if (
            typeof root === 'string' &&
            fs.existsSync(root) &&
            !fs.lstatSync(root).isDirectory() &&
            !constants.JEST_CONFIG_EXT_ORDER.some(ext => root.endsWith(ext))
          ) {
            return false;
          }

          return true;
        })
        .map((root, projectIndex) => {
          const projectIsTheOnlyProject =
            projectIndex === 0 && projects.length === 1;
          const skipArgvConfigOption = !(
            projectIsTheOnlyProject && projectIsCwd
          );

          return readConfig(
            argv,
            root,
            skipArgvConfigOption,
            configPath ? path.dirname(configPath) : cwd,
            projectIndex,
          );
        }),
    );

    ensureNoDuplicateConfigs(parsedConfigs, projects);
    configs = parsedConfigs.map(({projectConfig}) => projectConfig);
    if (!hasDeprecationWarnings) {
      hasDeprecationWarnings = parsedConfigs.some(
        ({hasDeprecationWarnings}) => !!hasDeprecationWarnings,
      );
    }
    // If no config was passed initially, use the one from the first project
    if (!globalConfig) {
      globalConfig = parsedConfigs[0].globalConfig;
    }
  }

  if (!globalConfig || !configs.length) {
    throw new Error('jest: No configuration found for any project.');
  }

  return {
    configs,
    globalConfig,
    hasDeprecationWarnings: !!hasDeprecationWarnings,
  };
}
