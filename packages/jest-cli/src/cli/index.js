/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AggregatedResult} from 'types/TestResult';
import type {Argv} from 'types/Argv';
import type {GlobalConfig, Path} from 'types/Config';

import path from 'path';
import {Console, clearLine, createDirectory} from 'jest-util';
import {validateCLIOptions} from 'jest-validate';
import {readConfigs, deprecationEntries} from 'jest-config';
import * as args from './args';
import chalk from 'chalk';
import createContext from '../lib/create_context';
import exit from 'exit';
import getChangedFilesPromise from '../getChangedFilesPromise';
import {formatHandleErrors} from '../collectHandles';
import handleDeprecationWarnings from '../lib/handle_deprecation_warnings';
import {print as preRunMessagePrint} from '../preRunMessage';
import runJest from '../runJest';
import Runtime from 'jest-runtime';
import TestWatcher from '../TestWatcher';
import watch from '../watch';
import pluralize from '../pluralize';
import yargs from 'yargs';
import rimraf from 'rimraf';
import {sync as realpath} from 'realpath-native';
import init from '../lib/init';
import logDebugMessages from '../lib/log_debug_messages';
import getVersion from '../version';

export async function run(maybeArgv?: Argv, project?: Path) {
  try {
    // $FlowFixMe:`allow reduced return
    const argv: Argv = buildArgv(maybeArgv, project);

    if (argv.init) {
      await init();
      return;
    }

    const projects = getProjectListFromCLIArgs(argv, project);

    const {results, globalConfig} = await runCLI(argv, projects);
    readResultsAndExit(results, globalConfig);
  } catch (error) {
    clearLine(process.stderr);
    clearLine(process.stdout);
    console.error(chalk.red(error.stack));
    exit(1);
    throw error;
  }
}

export const runCLI = async (
  argv: Argv,
  projects: Array<Path>,
): Promise<{results: AggregatedResult, globalConfig: GlobalConfig}> => {
  const realFs = require('fs');
  const fs = require('graceful-fs');
  fs.gracefulify(realFs);

  let results;

  // If we output a JSON object, we can't write anything to stdout, since
  // it'll break the JSON structure and it won't be valid.
  const outputStream =
    argv.json || argv.useStderr ? process.stderr : process.stdout;

  const {globalConfig, configs, hasDeprecationWarnings} = readConfigs(
    argv,
    projects,
  );

  if (argv.debug) {
    logDebugMessages(globalConfig, configs, outputStream);
  }

  if (argv.showConfig) {
    logDebugMessages(globalConfig, configs, process.stdout);
    exit(0);
  }

  if (argv.clearCache) {
    configs.forEach(config => {
      rimraf.sync(config.cacheDirectory);
      process.stdout.write(`Cleared ${config.cacheDirectory}\n`);
    });

    exit(0);
  }

  await _run(
    globalConfig,
    configs,
    hasDeprecationWarnings,
    outputStream,
    (r: AggregatedResult) => (results = r),
  );

  if (argv.watch || argv.watchAll) {
    // If in watch mode, return the promise that will never resolve.
    // If the watch mode is interrupted, watch should handle the process
    // shutdown.
    return new Promise(() => {});
  }

  if (!results) {
    throw new Error(
      'AggregatedResult must be present after test run is complete',
    );
  }

  const {openHandles} = results;

  if (openHandles && openHandles.length) {
    const formatted = formatHandleErrors(openHandles, configs[0]);

    const openHandlesString = pluralize('open handle', formatted.length, 's');

    const message =
      chalk.red(
        `\nJest has detected the following ${openHandlesString} potentially keeping Jest from exiting:\n\n`,
      ) + formatted.join('\n\n');

    console.error(message);
  }

  return Promise.resolve({globalConfig, results});
};

const readResultsAndExit = (
  result: ?AggregatedResult,
  globalConfig: GlobalConfig,
) => {
  const code = !result || result.success ? 0 : globalConfig.testFailureExitCode;

  // Only exit if needed
  process.on('exit', () => {
    if (typeof code === 'number' && code !== 0) {
      process.exitCode = code;
    }
  });

  if (globalConfig.forceExit) {
    if (!globalConfig.detectOpenHandles) {
      console.error(
        chalk.red.bold('Force exiting Jest\n\n') +
          chalk.red(
            'Have you considered using `--detectOpenHandles` to detect ' +
              'async operations that kept running after all tests finished?',
          ),
      );
    }

    exit(code);
  } else if (!globalConfig.detectOpenHandles) {
    setTimeout(() => {
      console.error(
        chalk.red.bold(
          'Jest did not exit one second after the test run has completed.\n\n',
        ) +
          chalk.red(
            'This usually means that there are asynchronous operations that ' +
              "weren't stopped in your tests. Consider running Jest with " +
              '`--detectOpenHandles` to troubleshoot this issue.',
          ),
      );
      // $FlowFixMe: `unref` exists in Node
    }, 1000).unref();
  }
};

export const buildArgv = (maybeArgv: ?Argv, project: ?Path) => {
  const version =
    getVersion() +
    (__dirname.includes(`packages${path.sep}jest-cli`) ? '-dev' : '');

  const rawArgv: Argv | string[] = maybeArgv || process.argv.slice(2);
  const argv: Argv = yargs(rawArgv)
    .usage(args.usage)
    .version(version)
    .alias('help', 'h')
    .options(args.options)
    .epilogue(args.docs)
    .check(args.check).argv;

  validateCLIOptions(
    argv,
    {...args.options, deprecationEntries},
    // strip leading dashes
    Array.isArray(rawArgv)
      ? rawArgv.map(rawArgv => rawArgv.replace(/^--?/, ''))
      : Object.keys(rawArgv),
  );

  // strip dashed args
  return Object.keys(argv).reduce((result, key) => {
    if (!key.includes('-')) {
      // $FlowFixMe:`allow reduced return
      result[key] = argv[key];
    }
    return result;
  }, {});
};

const getProjectListFromCLIArgs = (argv, project: ?Path) => {
  const projects = argv.projects ? argv.projects : [];

  if (project) {
    projects.push(project);
  }

  if (!projects.length && process.platform === 'win32') {
    try {
      projects.push(realpath(process.cwd()));
    } catch (err) {
      // do nothing, just catch error
      // process.binding('fs').realpath can throw, e.g. on mapped drives
    }
  }

  if (!projects.length) {
    projects.push(process.cwd());
  }

  return projects;
};

const buildContextsAndHasteMaps = async (
  configs,
  globalConfig,
  outputStream,
) => {
  const hasteMapInstances = Array(configs.length);
  const contexts = await Promise.all(
    configs.map(async (config, index) => {
      createDirectory(config.cacheDirectory);
      const hasteMapInstance = Runtime.createHasteMap(config, {
        console: new Console(outputStream, outputStream),
        maxWorkers: globalConfig.maxWorkers,
        resetCache: !config.cache,
        watch: globalConfig.watch || globalConfig.watchAll,
        watchman: globalConfig.watchman,
      });
      hasteMapInstances[index] = hasteMapInstance;
      return createContext(config, await hasteMapInstance.build());
    }),
  );

  return {contexts, hasteMapInstances};
};

const _run = async (
  globalConfig,
  configs,
  hasDeprecationWarnings,
  outputStream,
  onComplete,
) => {
  // Queries to hg/git can take a while, so we need to start the process
  // as soon as possible, so by the time we need the result it's already there.
  const changedFilesPromise = getChangedFilesPromise(globalConfig, configs);

  const {contexts, hasteMapInstances} = await buildContextsAndHasteMaps(
    configs,
    globalConfig,
    outputStream,
  );

  globalConfig.watch || globalConfig.watchAll
    ? await runWatch(
        contexts,
        configs,
        hasDeprecationWarnings,
        globalConfig,
        outputStream,
        hasteMapInstances,
        changedFilesPromise,
      )
    : await runWithoutWatch(
        globalConfig,
        contexts,
        outputStream,
        onComplete,
        changedFilesPromise,
      );
};

const runWatch = async (
  contexts,
  configs,
  hasDeprecationWarnings,
  globalConfig,
  outputStream,
  hasteMapInstances,
  changedFilesPromise,
) => {
  if (hasDeprecationWarnings) {
    try {
      await handleDeprecationWarnings(outputStream, process.stdin);
      return watch(globalConfig, contexts, outputStream, hasteMapInstances);
    } catch (e) {
      exit(0);
    }
  }

  return watch(globalConfig, contexts, outputStream, hasteMapInstances);
};

const runWithoutWatch = async (
  globalConfig,
  contexts,
  outputStream,
  onComplete,
  changedFilesPromise,
) => {
  const startRun = async () => {
    if (!globalConfig.listTests) {
      preRunMessagePrint(outputStream);
    }
    return await runJest({
      changedFilesPromise,
      contexts,
      failedTestsCache: null,
      globalConfig,
      onComplete,
      outputStream,
      startRun,
      testWatcher: new TestWatcher({isWatchMode: false}),
    });
  };
  return await startRun();
};
