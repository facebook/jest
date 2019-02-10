// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

import chalk from 'chalk';
import {isInteractive} from 'jest-util';

export default function getNoTestFoundRelatedToChangedFiles(globalConfig) {
  const ref = globalConfig.changedSince
    ? `"${globalConfig.changedSince}"`
    : 'last commit';
  let msg = chalk.bold(`No tests found related to files changed since ${ref}.`);

  if (isInteractive) {
    msg += chalk.dim(
      '\n' +
        (globalConfig.watch
          ? 'Press `a` to run all tests, or run Jest with `--watchAll`.'
          : 'Run Jest without `-o` or with `--all` to run all tests.'),
    );
  }

  return msg;
}
