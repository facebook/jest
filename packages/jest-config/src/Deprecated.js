/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import chalk from 'chalk';
import prettyFormat from 'pretty-format';

const format = (value: mixed) => prettyFormat(value, {min: true});

export default {
  mapCoverage: () => `  Option ${chalk.bold(
    '"mapCoverage"',
  )} has been removed, as it's no longer necessary.

  Please update your configuration.`,

  preprocessorIgnorePatterns: (options: {
    preprocessorIgnorePatterns: Array<string>,
  }) => `  Option ${chalk.bold(
    '"preprocessorIgnorePatterns"',
  )} was replaced by ${chalk.bold(
    '"transformIgnorePatterns"',
  )}, which support multiple preprocessors.

  Jest now treats your current configuration as:
  {
    ${chalk.bold('"transformIgnorePatterns"')}: ${chalk.bold(
    format(options.preprocessorIgnorePatterns),
  )}
  }

  Please update your configuration.`,

  scriptPreprocessor: (options: {
    scriptPreprocessor: string,
  }) => `  Option ${chalk.bold(
    '"scriptPreprocessor"',
  )} was replaced by ${chalk.bold(
    '"transform"',
  )}, which support multiple preprocessors.

  Jest now treats your current configuration as:
  {
    ${chalk.bold('"transform"')}: ${chalk.bold(
    `{".*": ${format(options.scriptPreprocessor)}}`,
  )}
  }

  Please update your configuration.`,

  setupTestFrameworkScriptFile: (options: {
    setupTestFrameworkScriptFile: Array<string>,
  }) => `  Option ${chalk.bold(
    '"setupTestFrameworkScriptFile"',
  )} was replaced by configuration ${chalk.bold(
    '"setupFilesAfterEnv"',
  )}, which supports multiple paths.

  Please update your configuration.`,

  testPathDirs: (options: {
    testPathDirs: Array<string>,
  }) => `  Option ${chalk.bold('"testPathDirs"')} was replaced by ${chalk.bold(
    '"roots"',
  )}.

  Jest now treats your current configuration as:
  {
    ${chalk.bold('"roots"')}: ${chalk.bold(format(options.testPathDirs))}
  }

  Please update your configuration.
  `,
};
