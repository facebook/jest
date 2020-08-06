/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk = require('chalk');
import {
  StackTraceConfig,
  StackTraceOptions,
  formatStackTrace,
} from 'jest-message-util';
import type {Config} from '@jest/types';
import type {ConsoleBuffer} from './types';

export default (
  // TODO: remove in 27
  root: string,
  // TODO: this is covered by GlobalConfig, switch over in 27
  verbose: boolean,
  buffer: ConsoleBuffer,
  // TODO: make mandatory and take Config.ProjectConfig in 27
  config: StackTraceConfig = {
    rootDir: root,
    testMatch: [],
  },
  // TODO: make mandatory in 27
  globalConfig?: Config.GlobalConfig,
): string => {
  const TITLE_INDENT = verbose ? '  ' : '    ';
  const CONSOLE_INDENT = TITLE_INDENT + '  ';

  const logEntries = buffer.reduce((output, {api, type, message, origin}) => {
    message = message
      .split(/\n/)
      .map(line => CONSOLE_INDENT + line)
      .join('\n');

    let typeMessage = `${api}.${type}`;
    let noStackTrace = true;
    let noCodeFrame = true;
    if (type === 'warn') {
      message = chalk.yellow(message);
      typeMessage = chalk.yellow(typeMessage);
      noStackTrace = globalConfig?.noStackTrace ?? false;
      noCodeFrame = false;
    } else if (type === 'error' || api === 'process.stderr') {
      message = chalk.red(message);
      typeMessage = chalk.red(typeMessage);
      noStackTrace = globalConfig?.noStackTrace ?? false;
      noCodeFrame = false;
    }

    const options: StackTraceOptions = {
      noCodeFrame,
      noStackTrace,
    };

    const formattedStackTrace = formatStackTrace(origin, config, options);

    return (
      output +
      TITLE_INDENT +
      chalk.dim(typeMessage) +
      '\n' +
      message.trimRight() +
      '\n' +
      chalk.dim(formattedStackTrace.trimRight()) +
      '\n\n'
    );
  }, '');

  return logEntries.trimRight() + '\n';
};
