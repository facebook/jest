/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Argv} from 'types/Argv';
import type {EnvironmentClass} from 'types/Environment';

import chalk from 'chalk';
import os from 'os';
import path from 'path';
import {sync as realpath} from 'realpath-native';
import yargs from 'yargs';
import {Console, setGlobal} from 'jest-util';
import {validateCLIOptions} from 'jest-validate';
import {readConfig, deprecationEntries} from 'jest-config';
import * as args from './args';

const VERSION = (require('../../package.json').version: string);

export function run(cliArgv?: Argv, cliInfo?: Array<string>) {
  const realFs = require('fs');
  const fs = require('graceful-fs');
  fs.gracefulify(realFs);

  let argv;
  if (cliArgv) {
    argv = cliArgv;
  } else {
    argv = yargs
      .usage(args.usage)
      .help(false)
      .version(false)
      .options(args.options).argv;

    validateCLIOptions(argv, {...args.options, deprecationEntries});
  }

  if (argv.help) {
    yargs.showHelp();
    process.on('exit', () => (process.exitCode = 1));
    return;
  }

  if (argv.version) {
    console.log(`v${VERSION}\n`);
    return;
  }

  if (!argv._.length) {
    console.log('Please provide a path to a script. (See --help for details)');
    process.on('exit', () => (process.exitCode = 1));
    return;
  }

  const root = realpath(process.cwd());
  const filePath = path.resolve(root, argv._[0]);

  if (argv.debug) {
    const info = cliInfo ? ', ' + cliInfo.join(', ') : '';
    console.log(`Using Jest Runtime v${VERSION}${info}`);
  }
  const options = readConfig(argv, root);
  const globalConfig = options.globalConfig;
  // Always disable automocking in scripts.
  const config = {
    ...options.projectConfig,
    automock: false,
    unmockedModulePathPatterns: null,
  };

  // Break circular dependency
  const Runtime = require('..');

  Runtime.createContext(config, {
    maxWorkers: Math.max(os.cpus().length - 1, 1),
    watchman: globalConfig.watchman,
  })
    .then(hasteMap => {
      /* $FlowFixMe */
      const Environment = (require(config.testEnvironment): EnvironmentClass);
      const environment = new Environment(config);
      setGlobal(
        environment.global,
        'console',
        new Console(process.stdout, process.stderr),
      );
      environment.global.jestProjectConfig = config;
      environment.global.jestGlobalConfig = globalConfig;

      const runtime = new Runtime(config, environment, hasteMap.resolver);
      runtime.requireModule(filePath);
    })
    .catch(e => {
      console.error(chalk.red(e.stack || e));
      process.on('exit', () => (process.exitCode = 1));
    });
}
