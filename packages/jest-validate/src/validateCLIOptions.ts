/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config} from '@jest/types';
import chalk from 'chalk';
import camelcase from 'camelcase';
// eslint-disable-next-line import/no-extraneous-dependencies
import {Options} from 'yargs';
import {ValidationError, createDidYouMeanMessage, format} from './utils';
import {deprecationWarning} from './deprecated';
import defaultConfig from './defaultConfig';
import {DeprecatedOptions} from './types';

const BULLET: string = chalk.bold('\u25cf');
export const DOCUMENTATION_NOTE = `  ${chalk.bold('CLI Options Documentation:')}
  https://jestjs.io/docs/en/cli.html
`;

const createCLIValidationError = (
  unrecognizedOptions: Array<string>,
  allowedOptions: Set<string>,
) => {
  let title = `${BULLET} Unrecognized CLI Parameter`;
  let message;
  const comment =
    `  ${chalk.bold('CLI Options Documentation')}:\n` +
    `  https://jestjs.io/docs/en/cli.html\n`;

  if (unrecognizedOptions.length === 1) {
    const unrecognized = unrecognizedOptions[0];
    const didYouMeanMessage = createDidYouMeanMessage(
      unrecognized,
      Array.from(allowedOptions),
    );
    message =
      `  Unrecognized option ${chalk.bold(format(unrecognized))}.` +
      (didYouMeanMessage ? ` ${didYouMeanMessage}` : '');
  } else {
    title += 's';
    message =
      `  Following options were not recognized:\n` +
      `  ${chalk.bold(format(unrecognizedOptions))}`;
  }

  return new ValidationError(title, message, comment);
};

const logDeprecatedOptions = (
  deprecatedOptions: Array<string>,
  deprecationEntries: DeprecatedOptions,
  argv: Config.Argv,
) => {
  deprecatedOptions.forEach(opt => {
    deprecationWarning(argv, opt, deprecationEntries, {
      ...defaultConfig,
      comment: DOCUMENTATION_NOTE,
    });
  });
};

export default function validateCLIOptions(
  argv: Config.Argv,
  options: {
    deprecationEntries: DeprecatedOptions;
    [s: string]: Options;
  },
  rawArgv: Array<string> = [],
) {
  const yargsSpecialOptions = ['$0', '_', 'help', 'h'];
  const deprecationEntries = options.deprecationEntries || {};
  const allowedOptions = Object.keys(options).reduce(
    (acc, option) =>
      acc.add(option).add((options[option].alias as string) || option),
    new Set(yargsSpecialOptions),
  );
  const unrecognizedOptions = Object.keys(argv).filter(
    arg =>
      !allowedOptions.has(camelcase(arg)) &&
      !allowedOptions.has(arg) &&
      (!rawArgv.length || rawArgv.includes(arg)),
    [],
  );

  if (unrecognizedOptions.length) {
    throw createCLIValidationError(unrecognizedOptions, allowedOptions);
  }

  const CLIDeprecations = Object.keys(deprecationEntries).reduce(
    (acc, entry) => {
      if (options[entry]) {
        acc[entry] = deprecationEntries[entry];
        const alias = options[entry].alias as string;
        if (alias) {
          acc[alias] = deprecationEntries[entry];
        }
      }
      return acc;
    },
    {} as Record<string, Function>,
  );
  const deprecations = new Set(Object.keys(CLIDeprecations));
  const deprecatedOptions = Object.keys(argv).filter(
    arg => deprecations.has(arg) && argv[arg] != null,
  );

  if (deprecatedOptions.length) {
    logDeprecatedOptions(deprecatedOptions, CLIDeprecations, argv);
  }

  return true;
}
