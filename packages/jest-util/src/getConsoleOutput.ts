/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import chalk from 'chalk';
import slash from 'slash';
import {Console} from '@jest/types';

export default (
  root: string,
  verbose: boolean,
  buffer: Console.ConsoleBuffer,
) => {
  const TITLE_INDENT = verbose ? '  ' : '    ';
  const CONSOLE_INDENT = TITLE_INDENT + '  ';

  return buffer.reduce((output, {type, message, origin}) => {
    origin = slash(path.relative(root, origin));
    message = message
      .split(/\n/)
      .map(line => CONSOLE_INDENT + line)
      .join('\n');

    let typeMessage = 'console.' + type;
    if (type === 'warn') {
      message = chalk.yellow(message);
      typeMessage = chalk.yellow(typeMessage);
    } else if (type === 'error') {
      message = chalk.red(message);
      typeMessage = chalk.red(typeMessage);
    }

    return (
      output +
      TITLE_INDENT +
      chalk.dim(typeMessage) +
      ' ' +
      chalk.dim(origin) +
      '\n' +
      message +
      '\n'
    );
  }, '');
};
