/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk = require('chalk');
import type {DeprecatedOptions} from 'jest-validate';
import prettyFormat = require('pretty-format');

const format = (value: unknown) => prettyFormat(value, {min: true});

const deprecatedOptions: DeprecatedOptions = {
  browser: () => `  Option ${chalk.bold(
    '"browser"',
  )} has been deprecated. Please install "browser-resolve" and use the "resolver" option in Jest configuration as follows:
  {
    ${chalk.bold('"resolver"')}: ${chalk.bold('"browser-resolve"')}
  }
  `,

  extraGlobals: () => `  Option ${chalk.bold(
    '"extraGlobals"',
  )} has been renamed, to sandboxInjectedGlobals.

  Please update your configuration.`,

  mapCoverage: () => `  Option ${chalk.bold(
    '"mapCoverage"',
  )} has been removed, as it's no longer necessary.

  Please update your configuration.`,

  moduleLoader: () => `  Option ${chalk.bold(
    '"moduleLoader"',
  )} has been renamed, to runtime.

  Please update your configuration.`,

  preprocessorIgnorePatterns: (options: {
    preprocessorIgnorePatterns?: Array<string>;
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
    scriptPreprocessor?: string;
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

  setupTestFrameworkScriptFile: (_options: {
    setupTestFrameworkScriptFile?: string;
  }) => `  Option ${chalk.bold(
    '"setupTestFrameworkScriptFile"',
  )} was replaced by configuration ${chalk.bold(
    '"setupFilesAfterEnv"',
  )}, which supports multiple paths.

  Please update your configuration.`,

  testPathDirs: (options: {
    testPathDirs?: Array<string>;
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

export default deprecatedOptions;
