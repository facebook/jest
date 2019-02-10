/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ValidationOptions} from './types';

import chalk from 'chalk';
import {
  format,
  logValidationWarning,
  createDidYouMeanMessage,
  WARNING,
} from './utils';

export const unknownOptionWarning = (
  config: Object,
  exampleConfig: Object,
  option: string,
  options: ValidationOptions,
  path?: Array<string>,
): void => {
  const didYouMean = createDidYouMeanMessage(
    option,
    Object.keys(exampleConfig),
  );
  const message =
    `  Unknown option ${chalk.bold(
      `"${path && path.length > 0 ? path.join('.') + '.' : ''}${option}"`,
    )} with value ${chalk.bold(format(config[option]))} was found.` +
    (didYouMean && ` ${didYouMean}`) +
    `\n  This is probably a typing mistake. Fixing it will remove this message.`;

  const comment = options.comment;
  const name = (options.title && options.title.warning) || WARNING;

  logValidationWarning(name, message, comment);
};
