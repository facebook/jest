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
import getType from 'jest-get-type';
import {formatPrettyObject, ValidationError, ERROR} from './utils';
import {getValues} from './condition';

export const errorMessage = (
  option: string,
  received: any,
  defaultValue: any,
  options: ValidationOptions,
  path?: Array<string>,
): void => {
  const conditions = getValues(defaultValue);
  const validTypes: Array<string> = Array.from(
    new Set(conditions.map(getType)),
  );

  const message = `  Option ${chalk.bold(
    `"${path && path.length > 0 ? path.join('.') + '.' : ''}${option}"`,
  )} must be of type:
    ${validTypes.map(e => chalk.bold.green(e)).join(' or ')}
  but instead received:
    ${chalk.bold.red(getType(received))}

  Example:
${formatExamples(option, conditions)}`;

  const comment = options.comment;
  const name = (options.title && options.title.error) || ERROR;

  throw new ValidationError(name, message, comment);
};

function formatExamples(option: string, examples: Array<any>) {
  return examples.map(
    e => `  {
    ${chalk.bold(`"${option}"`)}: ${chalk.bold(formatPrettyObject(e))}
  }`,
  ).join(`

  or

`);
}
