// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

import chalk from 'chalk';

export default function getNoTestFoundFailed() {
  return (
    chalk.bold('No failed test found.\n') +
    chalk.dim('Press `f` to quit "only failed tests" mode.')
  );
}
