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
import output from '@jest/output';
import {clearLine} from 'jest-util';
import {validateCLIOptions} from 'jest-validate';
import {deprecationEntries} from 'jest-config';
import {runCLI} from '@jest/core';
import * as args from './args';
import chalk from 'chalk';
import exit from 'exit';
import yargs from 'yargs';
import {sync as realpath} from 'realpath-native';
import init from '../init';

import {version as VERSION} from '../../package.json';

export async function run(maybeArgv?: Argv, project?: Path) {
  try {
    // $FlowFixMe:`allow reduced return
    const argv: Argv = buildArgv(maybeArgv);

    if (argv.init) {
      await init();
      return;
    }

    const projects = getProjectListFromCLIArgs(argv, project);

    const {results, globalConfig} = await runCLI(argv, projects);
    readResultsAndExit(results, globalConfig);
  } catch (error) {
    output.clearLine(output.err, output.out);
    output.err(chalk.red(error.stack));
    exit(1);
    throw error;
  }
}

export const buildArgv = (maybeArgv: ?Argv) => {
  const version =
    VERSION + (__dirname.includes(`packages${path.sep}jest-cli`) ? '-dev' : '');

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
      output.err(
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
      output.err(
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
