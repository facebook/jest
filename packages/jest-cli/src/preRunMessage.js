/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {clearLine, isInteractive} from 'jest-util';

import chalk from 'chalk';

export const print = (stream: stream$Writable | tty$WriteStream) => {
  if (isInteractive) {
    stream.write(chalk.bold.dim('Determining test suites to run...'));
  }
};

export const remove = (stream: stream$Writable | tty$WriteStream) => {
  if (isInteractive) {
    clearLine(stream);
  }
};
