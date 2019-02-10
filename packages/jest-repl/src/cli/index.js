#!/usr/bin/env node
/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';

import Runtime from 'jest-runtime';
import yargs from 'yargs';
import {validateCLIOptions} from 'jest-validate';
import {deprecationEntries} from 'jest-config';
import {version as VERSION} from '../../package.json';
import * as args from './args';

const REPL_SCRIPT = path.resolve(__dirname, './repl.js');

module.exports = function() {
  const argv = yargs.usage(args.usage).options(args.options).argv;

  validateCLIOptions(argv, {...args.options, deprecationEntries});

  argv._ = [REPL_SCRIPT];

  Runtime.runCLI(argv, [`Jest REPL v${VERSION}`]);
};
