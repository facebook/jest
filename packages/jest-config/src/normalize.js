/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Argv} from 'types/Argv';
import type {
  InitialOptions,
  DefaultOptions,
  ReporterConfig,
  GlobalConfig,
  Path,
  ProjectConfig,
} from 'types/Config';

import crypto from 'crypto';
import glob from 'glob';
import path from 'path';
import {ValidationError, validate} from 'jest-validate';
import validatePattern from './validatePattern';
import {clearLine, replacePathSepForGlob} from 'jest-util';
import chalk from 'chalk';
import getMaxWorkers from './getMaxWorkers';
import micromatch from 'micromatch';
import {sync as realpath} from 'realpath-native';
import Resolver from 'jest-resolve';
import {replacePathSepForRegex} from 'jest-regex-util';
import {
  BULLET,
  DOCUMENTATION_NOTE,
  replaceRootDirInPath,
  _replaceRootDirTags,
  escapeGlobCharacters,
  getTestEnvironment,
  getRunner,
  getWatchPlugin,
  resolve,
} from './utils';
import {DEFAULT_JS_PATTERN, DEFAULT_REPORTER_LABEL} from './constants';
import {validateReporters} from './ReporterValidationErrors';
import DEFAULT_CONFIG from './Defaults';
import DEPRECATED_CONFIG from './Deprecated';
import setFromArgv from './setFromArgv';
import VALID_CONFIG from './ValidConfig';

const ERROR = `${BULLET}Validation Error`;
const PRESET_EXTENSIONS = ['.json', '.js'];
const PRESET_NAME = 'jest-preset';

const createConfigError = message =>
  new ValidationError(ERROR, message, DOCUMENTATION_NOTE);

const mergeOptionWithPreset = (
  options: InitialOptions,
  preset: InitialOptions,
  optionName: string,
) => {
  if (options[optionName] && preset[optionName]) {
    options[optionName] = {
      ...options[optionName],
      ...preset[optionName],
      ...options[optionName],
    };
  }
};

const setupPreset = (
  options: InitialOptions,
  optionsPreset: string,
): InitialOptions => {
  let preset;
  const presetPath = replaceRootDirInPath(options.rootDir, optionsPreset);
  const presetModule = Resolver.findNodeModule(
    presetPath.startsWith('.')
      ? presetPath
      : path.join(presetPath, PRESET_NAME),
    {
      basedir: options.rootDir,
      extensions: PRESET_EXTENSIONS,
    },
  );

  try {
    // Force re-evaluation to support multiple projects
    try {
      if (presetModule) {
        delete require.cache[require.resolve(presetModule)];
      }
    } catch (e) {}

    // $FlowFixMe
    preset = (require(presetModule): InitialOptions);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createConfigError(
        `  Preset ${chalk.bold(presetPath)} is invalid:\n  ${error.message}`,
      );
    }

    const preset = Resolver.findNodeModule(presetPath, {
      basedir: options.rootDir,
    });

    if (preset) {
      throw createConfigError(
        `  Module ${chalk.bold(
          presetPath,
        )} should have "jest-preset.js" or "jest-preset.json" file at the root.`,
      );
    }

    throw createConfigError(`  Preset ${chalk.bold(presetPath)} not found.`);
  }

  if (options.setupFiles) {
    options.setupFiles = (preset.setupFiles || []).concat(options.setupFiles);
  }
  if (options.modulePathIgnorePatterns && preset.modulePathIgnorePatterns) {
    options.modulePathIgnorePatterns = preset.modulePathIgnorePatterns.concat(
      options.modulePathIgnorePatterns,
    );
  }
  mergeOptionWithPreset(options, preset, 'moduleNameMapper');
  mergeOptionWithPreset(options, preset, 'transform');

  return {...preset, ...options};
};

const setupBabelJest = (options: InitialOptions) => {
  const transform = options.transform;
  let babelJest;
  if (transform) {
    const customJSPattern = Object.keys(transform).find(pattern => {
      const regex = new RegExp(pattern);
      return regex.test('a.js') || regex.test('a.jsx');
    });
    const customTSPattern = Object.keys(transform).find(pattern => {
      const regex = new RegExp(pattern);
      return regex.test('a.ts') || regex.test('a.tsx');
    });

    if (customJSPattern) {
      const customJSTransformer = transform[customJSPattern];

      if (customJSTransformer === 'babel-jest') {
        babelJest = require.resolve('babel-jest');
        transform[customJSPattern] = babelJest;
      } else if (customJSTransformer.includes('babel-jest')) {
        babelJest = customJSTransformer;
      }
    }

    if (customTSPattern) {
      const customTSTransformer = transform[customTSPattern];

      if (customTSTransformer === 'babel-jest') {
        babelJest = require.resolve('babel-jest');
        transform[customTSPattern] = babelJest;
      } else if (customTSTransformer.includes('babel-jest')) {
        babelJest = customTSTransformer;
      }
    }
  } else {
    babelJest = require.resolve('babel-jest');
    options.transform = {
      [DEFAULT_JS_PATTERN]: babelJest,
    };
  }
};

const normalizeCollectCoverageOnlyFrom = (
  options: InitialOptions,
  key: string,
) => {
  const collectCoverageOnlyFrom = Array.isArray(options[key])
    ? options[key] // passed from argv
    : Object.keys(options[key]); // passed from options
  return collectCoverageOnlyFrom.reduce((map, filePath) => {
    filePath = path.resolve(
      options.rootDir,
      replaceRootDirInPath(options.rootDir, filePath),
    );
    map[filePath] = true;
    return map;
  }, Object.create(null));
};

const normalizeCollectCoverageFrom = (options: InitialOptions, key: string) => {
  let value;
  if (!options[key]) {
    value = [];
  }

  if (!Array.isArray(options[key])) {
    try {
      value = JSON.parse(options[key]);
    } catch (e) {}

    if (options[key] && !Array.isArray(value)) {
      value = [options[key]];
    }
  } else {
    value = options[key];
  }

  if (value) {
    value = value.map(filePath =>
      filePath.replace(/^(!?)(<rootDir>\/)(.*)/, '$1$3'),
    );
  }

  return value;
};

const normalizeUnmockedModulePathPatterns = (
  options: InitialOptions,
  key: string,
) =>
  // _replaceRootDirTags is specifically well-suited for substituting
  // <rootDir> in paths (it deals with properly interpreting relative path
  // separators, etc).
  //
  // For patterns, direct global substitution is far more ideal, so we
  // special case substitutions for patterns here.
  options[key].map(pattern =>
    replacePathSepForRegex(pattern.replace(/<rootDir>/g, options.rootDir)),
  );

const normalizePreprocessor = (options: InitialOptions): InitialOptions => {
  if (options.scriptPreprocessor && options.transform) {
    throw createConfigError(
      `  Options: ${chalk.bold('scriptPreprocessor')} and ${chalk.bold(
        'transform',
      )} cannot be used together.
  Please change your configuration to only use ${chalk.bold('transform')}.`,
    );
  }

  if (options.preprocessorIgnorePatterns && options.transformIgnorePatterns) {
    throw createConfigError(
      `  Options ${chalk.bold('preprocessorIgnorePatterns')} and ${chalk.bold(
        'transformIgnorePatterns',
      )} cannot be used together.
  Please change your configuration to only use ${chalk.bold(
    'transformIgnorePatterns',
  )}.`,
    );
  }

  if (options.scriptPreprocessor) {
    options.transform = {
      '.*': options.scriptPreprocessor,
    };
  }

  if (options.preprocessorIgnorePatterns) {
    options.transformIgnorePatterns = options.preprocessorIgnorePatterns;
  }

  delete options.scriptPreprocessor;
  delete options.preprocessorIgnorePatterns;
  return options;
};

const normalizeMissingOptions = (
  options: InitialOptions,
  configPath: ?Path,
  projectIndex: number,
): InitialOptions => {
  if (!options.name) {
    options.name = crypto
      .createHash('md5')
      .update(options.rootDir)
      // In case we load config from some path that has the same root dir
      .update(configPath || '')
      .update(String(projectIndex))
      .digest('hex');
  }

  if (!options.setupFiles) {
    options.setupFiles = [];
  }

  return options;
};

const normalizeRootDir = (options: InitialOptions): InitialOptions => {
  // Assert that there *is* a rootDir
  if (!options.hasOwnProperty('rootDir')) {
    throw createConfigError(
      `  Configuration option ${chalk.bold('rootDir')} must be specified.`,
    );
  }
  options.rootDir = path.normalize(options.rootDir);

  try {
    // try to resolve windows short paths, ignoring errors (permission errors, mostly)
    options.rootDir = realpath(options.rootDir);
  } catch (e) {
    // ignored
  }

  return options;
};

const normalizeReporters = (options: InitialOptions, basedir) => {
  const reporters = options.reporters;
  if (!reporters || !Array.isArray(reporters)) {
    return options;
  }

  validateReporters(reporters);
  options.reporters = reporters.map(reporterConfig => {
    const normalizedReporterConfig: ReporterConfig =
      typeof reporterConfig === 'string'
        ? // if reporter config is a string, we wrap it in an array
          // and pass an empty object for options argument, to normalize
          // the shape.
          [reporterConfig, {}]
        : reporterConfig;

    const reporterPath = replaceRootDirInPath(
      options.rootDir,
      normalizedReporterConfig[0],
    );

    if (reporterPath !== DEFAULT_REPORTER_LABEL) {
      const reporter = Resolver.findNodeModule(reporterPath, {
        basedir: options.rootDir,
      });
      if (!reporter) {
        throw new Error(
          `Could not resolve a module for a custom reporter.\n` +
            `  Module name: ${reporterPath}`,
        );
      }
      normalizedReporterConfig[0] = reporter;
    }
    return normalizedReporterConfig;
  });

  return options;
};

const buildTestPathPattern = (argv: Argv): string => {
  const patterns = [];

  if (argv._) {
    patterns.push(...argv._);
  }
  if (argv.testPathPattern) {
    patterns.push(...argv.testPathPattern);
  }

  const replacePosixSep = (pattern: string) => {
    if (path.sep === '/') {
      return pattern;
    }
    return pattern.replace(/\//g, '\\\\');
  };

  const testPathPattern = patterns.map(replacePosixSep).join('|');
  if (validatePattern(testPathPattern)) {
    return testPathPattern;
  } else {
    showTestPathPatternError(testPathPattern);
    return '';
  }
};

const showTestPathPatternError = (testPathPattern: string) => {
  clearLine(process.stdout);

  console.log(
    chalk.red(
      `  Invalid testPattern ${testPathPattern} supplied. ` +
        `Running all tests instead.`,
    ),
  );
};

export default function normalize(
  options: InitialOptions,
  argv: Argv,
  configPath: ?Path,
  projectIndex?: number = Infinity,
) {
  const {hasDeprecationWarnings} = validate(options, {
    comment: DOCUMENTATION_NOTE,
    deprecatedConfig: DEPRECATED_CONFIG,
    exampleConfig: VALID_CONFIG,
    recursiveBlacklist: [
      'collectCoverageOnlyFrom',
      // 'coverageThreshold' allows to use 'global' and glob strings on the same
      // level, there's currently no way we can deal with such config
      'coverageThreshold',
      'globals',
      'moduleNameMapper',
      'testEnvironmentOptions',
      'transform',
    ],
  });

  options = normalizePreprocessor(
    normalizeReporters(
      normalizeMissingOptions(
        normalizeRootDir(setFromArgv(options, argv)),
        configPath,
        projectIndex,
      ),
    ),
  );

  if (options.preset) {
    options = setupPreset(options, options.preset);
  }

  if (!options.setupFilesAfterEnv) {
    options.setupFilesAfterEnv = [];
  }

  if (
    options.setupTestFrameworkScriptFile &&
    options.setupFilesAfterEnv.length > 0
  ) {
    throw createConfigError(
      `  Options: ${chalk.bold(
        'setupTestFrameworkScriptFile',
      )} and ${chalk.bold('setupFilesAfterEnv')} cannot be used together.
  Please change your configuration to only use ${chalk.bold(
    'setupFilesAfterEnv',
  )}.`,
    );
  }

  if (options.setupTestFrameworkScriptFile) {
    options.setupFilesAfterEnv.push(options.setupTestFrameworkScriptFile);
  }

  options.testEnvironment = getTestEnvironment({
    rootDir: options.rootDir,
    testEnvironment: options.testEnvironment || DEFAULT_CONFIG.testEnvironment,
  });

  if (!options.roots && options.testPathDirs) {
    options.roots = options.testPathDirs;
    delete options.testPathDirs;
  }
  if (!options.roots) {
    options.roots = [options.rootDir];
  }

  if (!options.testRunner || options.testRunner === 'jasmine2') {
    options.testRunner = require.resolve('jest-jasmine2');
  }

  if (!options.coverageDirectory) {
    options.coverageDirectory = path.resolve(options.rootDir, 'coverage');
  }

  setupBabelJest(options);

  const newOptions: $Shape<DefaultOptions & ProjectConfig & GlobalConfig> = {
    ...DEFAULT_CONFIG,
  };

  try {
    // try to resolve windows short paths, ignoring errors (permission errors, mostly)
    newOptions.cwd = realpath(newOptions.cwd);
  } catch (e) {
    // ignored
  }

  if (options.resolver) {
    newOptions.resolver = resolve(null, {
      filePath: options.resolver,
      key: 'resolver',
      rootDir: options.rootDir,
    });
  }

  Object.keys(options).reduce((newOptions, key: $Keys<InitialOptions>) => {
    // The resolver has been resolved separately; skip it
    if (key === 'resolver') {
      return newOptions;
    }
    let value;
    switch (key) {
      case 'collectCoverageOnlyFrom':
        value = normalizeCollectCoverageOnlyFrom(options, key);
        break;
      case 'setupFiles':
      case 'setupFilesAfterEnv':
      case 'snapshotSerializers':
        value =
          options[key] &&
          options[key].map(filePath =>
            resolve(newOptions.resolver, {
              filePath,
              key,
              rootDir: options.rootDir,
            }),
          );
        break;
      case 'modulePaths':
      case 'roots':
        value =
          options[key] &&
          options[key].map(filePath =>
            path.resolve(
              options.rootDir,
              replaceRootDirInPath(options.rootDir, filePath),
            ),
          );
        break;
      case 'collectCoverageFrom':
        value = normalizeCollectCoverageFrom(options, key);
        break;
      case 'cacheDirectory':
      case 'coverageDirectory':
        value =
          options[key] &&
          path.resolve(
            options.rootDir,
            replaceRootDirInPath(options.rootDir, options[key]),
          );
        break;
      case 'dependencyExtractor':
      case 'globalSetup':
      case 'globalTeardown':
      case 'moduleLoader':
      case 'snapshotResolver':
      case 'testResultsProcessor':
      case 'testRunner':
      case 'filter':
        value =
          options[key] &&
          resolve(newOptions.resolver, {
            filePath: options[key],
            key,
            rootDir: options.rootDir,
          });
        break;
      case 'runner':
        value =
          options[key] &&
          getRunner(newOptions.resolver, {
            filePath: options[key],
            rootDir: options.rootDir,
          });
        break;
      case 'prettierPath':
        // We only want this to throw if "prettierPath" is explicitly passed
        // from config or CLI, and the requested path isn't found. Otherwise we
        // set it to null and throw an error lazily when it is used.
        value =
          options[key] &&
          resolve(newOptions.resolver, {
            filePath: options[key],
            key,
            optional: options[key] === DEFAULT_CONFIG[key],
            rootDir: options.rootDir,
          });
        break;
      case 'moduleNameMapper':
        const moduleNameMapper = options[key];
        value =
          moduleNameMapper &&
          Object.keys(moduleNameMapper).map(regex => {
            const item = moduleNameMapper && moduleNameMapper[regex];
            return item && [regex, _replaceRootDirTags(options.rootDir, item)];
          });
        break;
      case 'transform':
        const transform = options[key];
        value =
          transform &&
          Object.keys(transform).map(regex => [
            regex,
            resolve(newOptions.resolver, {
              filePath: transform[regex],
              key,
              rootDir: options.rootDir,
            }),
          ]);
        break;
      case 'coveragePathIgnorePatterns':
      case 'modulePathIgnorePatterns':
      case 'testPathIgnorePatterns':
      case 'transformIgnorePatterns':
      case 'watchPathIgnorePatterns':
      case 'unmockedModulePathPatterns':
        value = normalizeUnmockedModulePathPatterns(options, key);
        break;
      case 'haste':
        value = {...options[key]};
        if (value.hasteImplModulePath != null) {
          value.hasteImplModulePath = resolve(newOptions.resolver, {
            filePath: replaceRootDirInPath(
              options.rootDir,
              value.hasteImplModulePath,
            ),
            key: 'haste.hasteImplModulePath',
            rootDir: options.rootDir,
          });
        }
        break;
      case 'projects':
        value = (options[key] || [])
          .map(project =>
            typeof project === 'string'
              ? _replaceRootDirTags(options.rootDir, project)
              : project,
          )
          .reduce((projects, project) => {
            // Project can be specified as globs. If a glob matches any files,
            // We expand it to these paths. If not, we keep the original path
            // for the future resolution.
            const globMatches =
              typeof project === 'string' ? glob.sync(project) : [];
            return projects.concat(globMatches.length ? globMatches : project);
          }, []);
        break;
      case 'moduleDirectories':
      case 'testMatch':
        {
          const replacedRootDirTags = _replaceRootDirTags(
            escapeGlobCharacters(options.rootDir),
            options[key],
          );

          if (replacedRootDirTags) {
            value = Array.isArray(replacedRootDirTags)
              ? replacedRootDirTags.map(replacePathSepForGlob)
              : replacePathSepForGlob(replacedRootDirTags);
          } else {
            value = replacedRootDirTags;
          }
        }
        break;
      case 'testRegex':
        value = options[key]
          ? [].concat(options[key]).map(replacePathSepForRegex)
          : [];
        break;
      case 'moduleFileExtensions': {
        value = options[key];

        if (
          Array.isArray(value) && // If it's the wrong type, it can throw at a later time
          (options.runner === undefined ||
            options.runner === DEFAULT_CONFIG.runner) && // Only require 'js' for the default jest-runner
          !value.includes('js')
        ) {
          const errorMessage =
            `  moduleFileExtensions must include 'js':\n` +
            `  but instead received:\n` +
            `    ${chalk.bold.red(JSON.stringify(value))}`;

          // If `js` is not included, any dependency Jest itself injects into
          // the environment, like jasmine or sourcemap-support, will need to
          // `require` its modules with a file extension. This is not plausible
          // in the long run, so it's way easier to just fail hard early.
          // We might consider throwing if `json` is missing as well, as it's a
          // fair assumption from modules that they can do
          // `require('some-package/package') without the trailing `.json` as it
          // works in Node normally.
          throw createConfigError(
            errorMessage +
              "\n  Please change your configuration to include 'js'.",
          );
        }

        break;
      }
      case 'bail': {
        if (typeof options[key] === 'boolean') {
          value = options[key] ? 1 : 0;
        } else if (typeof options[key] === 'string') {
          value = 1;
          // If Jest is invoked as `jest --bail someTestPattern` then need to
          // move the pattern from the `bail` configuration and into `argv._`
          // to be processed as an extra parameter
          argv._.push(options[key]);
        } else {
          value = options[key];
        }
        break;
      }
      case 'automock':
      case 'browser':
      case 'cache':
      case 'changedSince':
      case 'changedFilesWithAncestor':
      case 'clearMocks':
      case 'collectCoverage':
      case 'coverageReporters':
      case 'coverageThreshold':
      case 'detectLeaks':
      case 'detectOpenHandles':
      case 'displayName':
      case 'errorOnDeprecated':
      case 'expand':
      case 'extraGlobals':
      case 'globals':
      case 'findRelatedTests':
      case 'forceCoverageMatch':
      case 'forceExit':
      case 'lastCommit':
      case 'listTests':
      case 'logHeapUsage':
      case 'maxConcurrency':
      case 'mapCoverage':
      case 'name':
      case 'noStackTrace':
      case 'notify':
      case 'notifyMode':
      case 'onlyChanged':
      case 'outputFile':
      case 'passWithNoTests':
      case 'replname':
      case 'reporters':
      case 'resetMocks':
      case 'resetModules':
      case 'restoreMocks':
      case 'rootDir':
      case 'runTestsByPath':
      case 'silent':
      case 'skipFilter':
      case 'skipNodeResolution':
      case 'testEnvironment':
      case 'testEnvironmentOptions':
      case 'testFailureExitCode':
      case 'testLocationInResults':
      case 'testNamePattern':
      case 'testURL':
      case 'timers':
      case 'useStderr':
      case 'verbose':
      case 'watch':
      case 'watchAll':
      case 'watchman':
        value = options[key];
        break;
      case 'watchPlugins':
        value = (options[key] || []).map(watchPlugin => {
          if (typeof watchPlugin === 'string') {
            return {
              config: {},
              path: getWatchPlugin(newOptions.resolver, {
                filePath: watchPlugin,
                rootDir: options.rootDir,
              }),
            };
          } else {
            return {
              config: watchPlugin[1] || {},
              path: getWatchPlugin(newOptions.resolver, {
                filePath: watchPlugin[0],
                rootDir: options.rootDir,
              }),
            };
          }
        });
        break;
    }
    // $FlowFixMe - automock is missing in GlobalConfig, so what
    newOptions[key] = value;
    return newOptions;
  }, newOptions);

  newOptions.nonFlagArgs = argv._;
  newOptions.testPathPattern = buildTestPathPattern(argv);
  newOptions.json = argv.json;

  newOptions.testFailureExitCode = parseInt(newOptions.testFailureExitCode, 10);

  for (const key of [
    'lastCommit',
    'changedFilesWithAncestor',
    'changedSince',
  ]) {
    if (newOptions[key]) {
      newOptions.onlyChanged = true;
    }
  }

  if (argv.all) {
    newOptions.onlyChanged = false;
  } else if (newOptions.testPathPattern) {
    // When passing a test path pattern we don't want to only monitor changed
    // files unless `--watch` is also passed.
    newOptions.onlyChanged = newOptions.watch;
  }

  newOptions.updateSnapshot =
    argv.ci && !argv.updateSnapshot
      ? 'none'
      : argv.updateSnapshot
      ? 'all'
      : 'new';

  newOptions.maxConcurrency = parseInt(newOptions.maxConcurrency, 10);
  newOptions.maxWorkers = getMaxWorkers(argv);

  if (newOptions.testRegex.length && options.testMatch) {
    throw createConfigError(
      `  Configuration options ${chalk.bold('testMatch')} and` +
        ` ${chalk.bold('testRegex')} cannot be used together.`,
    );
  }

  if (newOptions.testRegex.length && !options.testMatch) {
    // Prevent the default testMatch conflicting with any explicitly
    // configured `testRegex` value
    newOptions.testMatch = [];
  }

  // If argv.json is set, coverageReporters shouldn't print a text report.
  if (argv.json) {
    newOptions.coverageReporters = (newOptions.coverageReporters || []).filter(
      reporter => reporter !== 'text',
    );
  }

  // If collectCoverage is enabled while using --findRelatedTests we need to
  // avoid having false negatives in the generated coverage report.
  // The following: `--findRelatedTests '/rootDir/file1.js' --coverage`
  // Is transformed to: `--findRelatedTests '/rootDir/file1.js' --coverage --collectCoverageFrom 'file1.js'`
  // where arguments to `--collectCoverageFrom` should be globs (or relative
  // paths to the rootDir)
  if (newOptions.collectCoverage && argv.findRelatedTests) {
    let collectCoverageFrom = argv._.map(filename => {
      filename = replaceRootDirInPath(options.rootDir, filename);
      return path.isAbsolute(filename)
        ? path.relative(options.rootDir, filename)
        : filename;
    });

    // Don't override existing collectCoverageFrom options
    if (newOptions.collectCoverageFrom) {
      collectCoverageFrom = collectCoverageFrom.reduce((patterns, filename) => {
        if (
          !micromatch.some(
            replacePathSepForGlob(path.relative(options.rootDir, filename)),
            newOptions.collectCoverageFrom,
          )
        ) {
          return patterns;
        }
        return [...patterns, filename];
      }, newOptions.collectCoverageFrom);
    }

    newOptions.collectCoverageFrom = collectCoverageFrom;
  }

  return {
    hasDeprecationWarnings,
    options: newOptions,
  };
}
