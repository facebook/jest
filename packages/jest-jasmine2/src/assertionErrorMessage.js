/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// TODO: Converted to TS. It's also not exported, but should be imported from `matcher-utils`
import type {DiffOptions} from 'jest-diff';

import {diff, printReceived, printExpected} from 'jest-matcher-utils';
import chalk from 'chalk';

type AssertionError = {|
  actual: ?string,
  expected: ?string,
  generatedMessage: boolean,
  message: string,
  name: string,
  operator: ?string,
  stack: string,
|};

const assertOperatorsMap = {
  '!=': 'notEqual',
  '!==': 'notStrictEqual',
  '==': 'equal',
  '===': 'strictEqual',
};

const humanReadableOperators = {
  deepEqual: 'to deeply equal',
  deepStrictEqual: 'to deeply and strictly equal',
  equal: 'to be equal',
  notDeepEqual: 'not to deeply equal',
  notDeepStrictEqual: 'not to deeply and strictly equal',
  notEqual: 'to not be equal',
  notStrictEqual: 'not be strictly equal',
  strictEqual: 'to strictly be equal',
};

const getOperatorName = (operator: ?string, stack: string) => {
  if (typeof operator === 'string') {
    return assertOperatorsMap[operator] || operator;
  }
  if (stack.match('.doesNotThrow')) {
    return 'doesNotThrow';
  }
  if (stack.match('.throws')) {
    return 'throws';
  }
  return '';
};

const operatorMessage = (operator: ?string) => {
  const niceOperatorName = getOperatorName(operator, '');
  // $FlowFixMe: we default to the operator itself, so holes in the map doesn't matter
  const humanReadableOperator = humanReadableOperators[niceOperatorName];

  return typeof operator === 'string'
    ? `${humanReadableOperator || niceOperatorName} to:\n`
    : '';
};

const assertThrowingMatcherHint = (operatorName: string) =>
  chalk.dim('assert') +
  chalk.dim('.' + operatorName + '(') +
  chalk.red('function') +
  chalk.dim(')');

const assertMatcherHint = (operator: ?string, operatorName: string) => {
  let message =
    chalk.dim('assert') +
    chalk.dim('.' + operatorName + '(') +
    chalk.red('received') +
    chalk.dim(', ') +
    chalk.green('expected') +
    chalk.dim(')');

  if (operator === '==') {
    message +=
      ' or ' +
      chalk.dim('assert') +
      chalk.dim('(') +
      chalk.red('received') +
      chalk.dim(') ');
  }

  return message;
};

function assertionErrorMessage(error: AssertionError, options: DiffOptions) {
  const {expected, actual, generatedMessage, message, operator, stack} = error;
  const diffString = diff(expected, actual, options);
  const hasCustomMessage = !generatedMessage;
  const operatorName = getOperatorName(operator, stack);
  const trimmedStack = stack
    .replace(message, '')
    .replace(/AssertionError(.*)/g, '');

  if (operatorName === 'doesNotThrow') {
    return (
      assertThrowingMatcherHint(operatorName) +
      '\n\n' +
      chalk.reset(`Expected the function not to throw an error.\n`) +
      chalk.reset(`Instead, it threw:\n`) +
      `  ${printReceived(actual)}` +
      chalk.reset(hasCustomMessage ? '\n\nMessage:\n  ' + message : '') +
      trimmedStack
    );
  }

  if (operatorName === 'throws') {
    return (
      assertThrowingMatcherHint(operatorName) +
      '\n\n' +
      chalk.reset(`Expected the function to throw an error.\n`) +
      chalk.reset(`But it didn't throw anything.`) +
      chalk.reset(hasCustomMessage ? '\n\nMessage:\n  ' + message : '') +
      trimmedStack
    );
  }

  return (
    assertMatcherHint(operator, operatorName) +
    '\n\n' +
    chalk.reset(`Expected value ${operatorMessage(operator)}`) +
    `  ${printExpected(expected)}\n` +
    chalk.reset(`Received:\n`) +
    `  ${printReceived(actual)}` +
    chalk.reset(hasCustomMessage ? '\n\nMessage:\n  ' + message : '') +
    (diffString ? `\n\nDifference:\n\n${diffString}` : '') +
    trimmedStack
  );
}

export default assertionErrorMessage;
