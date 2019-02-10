/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @flow
 */

import type {ReporterConfig} from 'types/Config';

import {ValidationError} from 'jest-validate';
import chalk from 'chalk';
import getType from 'jest-get-type';
import {DOCUMENTATION_NOTE, BULLET} from './utils';

const validReporterTypes = ['array', 'string'];
const ERROR = `${BULLET}Reporter Validation Error`;

/**
 * Reporter Validation Error is thrown if the given arguments
 * within the reporter are not valid.
 *
 * This is a highly specific reporter error and in the future will be
 * merged with jest-validate. Till then, we can make use of it. It works
 * and that's what counts most at this time.
 */
export function createReporterError(
  reporterIndex: number,
  reporterValue: Array<ReporterConfig> | string,
): ValidationError {
  const errorMessage =
    `  Reporter at index ${reporterIndex} must be of type:\n` +
    `    ${chalk.bold.green(validReporterTypes.join(' or '))}\n` +
    `  but instead received:\n` +
    `    ${chalk.bold.red(getType(reporterValue))}`;

  return new ValidationError(ERROR, errorMessage, DOCUMENTATION_NOTE);
}

export function createArrayReporterError(
  arrayReporter: ReporterConfig,
  reporterIndex: number,
  valueIndex: number,
  value: string | Object,
  expectedType: string,
  valueName: string,
): ValidationError {
  const errorMessage =
    `  Unexpected value for ${valueName} ` +
    `at index ${valueIndex} of reporter at index ${reporterIndex}\n` +
    '  Expected:\n' +
    `    ${chalk.bold.red(expectedType)}\n` +
    '  Got:\n' +
    `    ${chalk.bold.green(getType(value))}\n` +
    `  Reporter configuration:\n` +
    `    ${chalk.bold.green(
      JSON.stringify(arrayReporter, null, 2)
        .split('\n')
        .join('\n    '),
    )}`;

  return new ValidationError(ERROR, errorMessage, DOCUMENTATION_NOTE);
}

export function validateReporters(
  reporterConfig: Array<ReporterConfig | string>,
): boolean {
  return reporterConfig.every((reporter, index) => {
    if (Array.isArray(reporter)) {
      validateArrayReporter(reporter, index);
    } else if (typeof reporter !== 'string') {
      throw createReporterError(index, reporter);
    }

    return true;
  });
}

function validateArrayReporter(
  arrayReporter: ReporterConfig,
  reporterIndex: number,
) {
  const [path, options] = arrayReporter;
  if (typeof path !== 'string') {
    throw createArrayReporterError(
      arrayReporter,
      reporterIndex,
      0,
      path,
      'string',
      'Path',
    );
  } else if (typeof options !== 'object') {
    throw createArrayReporterError(
      arrayReporter,
      reporterIndex,
      1,
      options,
      'object',
      'Reporter Configuration',
    );
  }
}
