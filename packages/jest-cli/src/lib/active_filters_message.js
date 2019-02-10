/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {GlobalConfig} from 'types/Config';
import chalk from 'chalk';

const activeFilters = (
  globalConfig: GlobalConfig,
  delimiter: string = '\n',
) => {
  const {testNamePattern, testPathPattern} = globalConfig;
  if (testNamePattern || testPathPattern) {
    const filters = [
      testPathPattern
        ? chalk.dim('filename ') + chalk.yellow('/' + testPathPattern + '/')
        : null,
      testNamePattern
        ? chalk.dim('test name ') + chalk.yellow('/' + testNamePattern + '/')
        : null,
    ]
      .filter(f => f)
      .join(', ');

    const messages = ['\n' + chalk.bold('Active Filters: ') + filters];

    return messages.filter(message => !!message).join(delimiter);
  }

  return '';
};

export default activeFilters;
