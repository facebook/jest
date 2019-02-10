/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';
import jestDiff from 'jest-diff';
import getType from 'jest-get-type';
import prettyFormat from 'pretty-format';
const {
  AsymmetricMatcher,
  DOMCollection,
  DOMElement,
  Immutable,
  ReactElement,
  ReactTestComponent,
} = prettyFormat.plugins;

const PLUGINS = [
  ReactTestComponent,
  ReactElement,
  DOMElement,
  DOMCollection,
  Immutable,
  AsymmetricMatcher,
];

export type MatcherHintOptions = {
  comment?: string;
  isDirectExpectCall?: boolean;
  isNot?: boolean;
  promise?: string;
  secondArgument?: string;
};

export const EXPECTED_COLOR = chalk.green;
export const RECEIVED_COLOR = chalk.red;
const DIM_COLOR = chalk.dim;

const NUMBERS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
];

export const SUGGEST_TO_EQUAL = chalk.dim(
  'Note that you are testing for equality with the stricter `toBe` matcher using `Object.is`. For deep equality only, use `toEqual` instead.',
);

export const SUGGEST_TO_CONTAIN_EQUAL = chalk.dim(
  'Looks like you wanted to test for object/array equality with the stricter `toContain` matcher. You probably need to use `toContainEqual` instead.',
);

export const stringify = (object: unknown, maxDepth: number = 10): string => {
  const MAX_LENGTH = 10000;
  let result;

  try {
    result = prettyFormat(object, {
      maxDepth,
      min: true,
      plugins: PLUGINS,
    });
  } catch (e) {
    result = prettyFormat(object, {
      callToJSON: false,
      maxDepth,
      min: true,
      plugins: PLUGINS,
    });
  }

  return result.length >= MAX_LENGTH && maxDepth > 1
    ? stringify(object, Math.floor(maxDepth / 2))
    : result;
};

export const highlightTrailingWhitespace = (text: string): string =>
  text.replace(/\s+$/gm, chalk.inverse('$&'));

export const printReceived = (object: unknown) =>
  RECEIVED_COLOR(highlightTrailingWhitespace(stringify(object)));
export const printExpected = (value: unknown) =>
  EXPECTED_COLOR(highlightTrailingWhitespace(stringify(value)));

export const printWithType = (
  name: string, // 'Expected' or 'Received'
  value: unknown,
  print: (value: unknown) => string, // printExpected or printReceived
) => {
  const type = getType(value);
  const hasType =
    type !== 'null' && type !== 'undefined'
      ? `${name} has type:  ${type}\n`
      : '';
  const hasValue = `${name} has value: ${print(value)}`;
  return hasType + hasValue;
};

export const ensureNoExpected = (
  expected: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => {
  if (typeof expected !== 'undefined') {
    // Prepend maybe not only for backward compatibility.
    const matcherString = (options ? '' : '[.not]') + matcherName;
    throw new Error(
      matcherErrorMessage(
        matcherHint(matcherString, undefined, '', options),
        // Because expected is omitted in hint above,
        // expected is black instead of green in message below.
        'this matcher must not have an expected argument',
        printWithType('Expected', expected, printExpected),
      ),
    );
  }
};

export const ensureActualIsNumber = (actual: unknown, matcherName: string) => {
  matcherName || (matcherName = 'This matcher');
  if (typeof actual !== 'number') {
    throw new Error(
      matcherErrorMessage(
        matcherHint('[.not]' + matcherName),
        `${RECEIVED_COLOR('received')} value must be a number`,
        printWithType('Received', actual, printReceived),
      ),
    );
  }
};

export const ensureExpectedIsNumber = (
  expected: unknown,
  matcherName: string,
) => {
  matcherName || (matcherName = 'This matcher');
  if (typeof expected !== 'number') {
    throw new Error(
      matcherErrorMessage(
        matcherHint('[.not]' + matcherName),
        `${EXPECTED_COLOR('expected')} value must be a number`,
        printWithType('Expected', expected, printExpected),
      ),
    );
  }
};

export const ensureNumbers = (
  actual: unknown,
  expected: unknown,
  matcherName: string,
) => {
  ensureActualIsNumber(actual, matcherName);
  ensureExpectedIsNumber(expected, matcherName);
};

// Sometimes, e.g. when comparing two numbers, the output from jest-diff
// does not contain more information than the `Expected:` / `Received:` already gives.
// In those cases, we do not print a diff to make the output shorter and not redundant.
const shouldPrintDiff = (actual: unknown, expected: unknown) => {
  if (typeof actual === 'number' && typeof expected === 'number') {
    return false;
  }
  if (typeof actual === 'boolean' && typeof expected === 'boolean') {
    return false;
  }
  return true;
};
export const diff: typeof jestDiff = (a, b, options) =>
  shouldPrintDiff(a, b) ? jestDiff(a, b, options) : null;

export const pluralize = (word: string, count: number) =>
  (NUMBERS[count] || count) + ' ' + word + (count === 1 ? '' : 's');

// To display lines of labeled values as two columns with monospace alignment:
// given the strings which will describe the values,
// return function which given each string, returns the label:
// string, colon, space, and enough padding spaces to align the value.

type PrintLabel = (string: string) => string;

export const getLabelPrinter = (...strings: Array<string>): PrintLabel => {
  const maxLength = strings.reduce(
    (max, string) => (string.length > max ? string.length : max),
    0,
  );
  return string => `${string}: ${' '.repeat(maxLength - string.length)}`;
};

export const matcherErrorMessage = (
  hint: string, // assertion returned from call to matcherHint
  generic: string, // condition which correct value must fulfill
  specific: string, // incorrect value returned from call to printWithType
) => `${hint}\n\n${chalk.bold('Matcher error')}: ${generic}\n\n${specific}`;

// Display assertion for the report when a test fails.
// New format: rejects/resolves, not, and matcher name have black color
// Old format: matcher name has dim color
export const matcherHint = (
  matcherName: string,
  received: string = 'received',
  expected: string = 'expected',
  options: MatcherHintOptions = {},
) => {
  const {
    comment = '',
    isDirectExpectCall = false, // seems redundant with received === ''
    isNot = false,
    promise = '',
    secondArgument = '',
  } = options;
  let hint = '';
  let dimString = 'expect'; // concatenate adjacent dim substrings

  if (!isDirectExpectCall && received !== '') {
    hint += DIM_COLOR(dimString + '(') + RECEIVED_COLOR(received);
    dimString = ')';
  }

  if (promise !== '') {
    hint += DIM_COLOR(dimString + '.') + promise;
    dimString = '';
  }

  if (isNot) {
    hint += DIM_COLOR(dimString + '.') + 'not';
    dimString = '';
  }

  if (matcherName.includes('.')) {
    // Old format: for backward compatibility,
    // especially without promise or isNot options
    dimString += matcherName;
  } else {
    // New format: omit period from matcherName arg
    hint += DIM_COLOR(dimString + '.') + matcherName;
    dimString = '';
  }

  if (expected === '') {
    dimString += '()';
  } else {
    hint += DIM_COLOR(dimString + '(') + EXPECTED_COLOR(expected);
    if (secondArgument) {
      hint += DIM_COLOR(', ') + EXPECTED_COLOR(secondArgument);
    }
    dimString = ')';
  }

  if (comment !== '') {
    dimString += ' // ' + comment;
  }

  if (dimString !== '') {
    hint += DIM_COLOR(dimString);
  }

  return hint;
};
