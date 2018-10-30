/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {MatchersObject} from 'types/Matchers';

import getType from 'jest-get-type';
import {escapeStrForRegex} from 'jest-regex-util';
import {formatStackTrace, separateMessageFromStack} from 'jest-message-util';
import {
  RECEIVED_COLOR,
  highlightTrailingWhitespace,
  matcherHint,
  printExpected,
  printWithType,
} from 'jest-matcher-utils';
import {equals} from './jasmine_utils';

export const createMatcher = (matcherName: string, fromPromise?: boolean) => (
  actual: Function,
  expected: string | Error | RegExp,
) => {
  const value = expected;
  let error;
  if (fromPromise) {
    error = actual;
  } else {
    if (typeof actual !== 'function') {
      if (!fromPromise) {
        throw new Error(
          matcherHint(matcherName, 'function', getType(value)) +
            '\n\n' +
            'Received value must be a function, but instead ' +
            `"${getType(actual)}" was found`,
        );
      }
    } else {
      try {
        actual();
      } catch (e) {
        error = e;
      }
    }
  }

  if (typeof expected === 'string') {
    expected = new RegExp(escapeStrForRegex(expected));
  }

  if (typeof expected === 'function') {
    return toThrowMatchingError(matcherName, error, expected);
  } else if (expected && typeof expected.test === 'function') {
    return toThrowMatchingStringOrRegexp(
      matcherName,
      error,
      (expected: any),
      value,
    );
  } else if (expected && typeof expected === 'object') {
    return toThrowMatchingErrorInstance(matcherName, error, (expected: any));
  } else if (expected === undefined) {
    const pass = error !== undefined;
    return {
      message: pass
        ? () =>
            matcherHint('.not' + matcherName, 'function', '') +
            '\n\n' +
            'Expected the function not to throw an error.\n' +
            printActualErrorMessage(error)
        : () =>
            matcherHint(matcherName, 'function', getType(value)) +
            '\n\n' +
            'Expected the function to throw an error.\n' +
            printActualErrorMessage(error),
      pass,
    };
  } else {
    throw new Error(
      matcherHint('.not' + matcherName, 'function', getType(value)) +
        '\n\n' +
        'Unexpected argument passed.\nExpected: ' +
        `${printExpected('string')}, ${printExpected(
          'Error (type)',
        )} or ${printExpected('regexp')}.\n` +
        printWithType('Got', String(expected), printExpected),
    );
  }
};

const matchers: MatchersObject = {
  toThrow: createMatcher('.toThrow'),
  toThrowError: createMatcher('.toThrowError'),
};

const toThrowMatchingStringOrRegexp = (
  name: string,
  error: ?Error,
  pattern: RegExp,
  value: RegExp | string | Error,
) => {
  if (error && !error.message && !error.name) {
    error = new Error(error);
  }

  const pass = !!(error && error.message.match(pattern));
  const message = pass
    ? () =>
        matcherHint('.not' + name, 'function', getType(value)) +
        '\n\n' +
        `Expected the function not to throw an error matching:\n` +
        `  ${printExpected(value)}\n` +
        printActualErrorMessage(error)
    : () =>
        matcherHint(name, 'function', getType(value)) +
        '\n\n' +
        `Expected the function to throw an error matching:\n` +
        `  ${printExpected(value)}\n` +
        printActualErrorMessage(error);

  return {message, pass};
};

const toThrowMatchingErrorInstance = (
  name: string,
  error: ?Error,
  expectedError: Error,
) => {
  if (error && !error.message && !error.name) {
    error = new Error(error);
  }

  const pass = equals(error, expectedError);
  const message = pass
    ? () =>
        matcherHint('.not' + name, 'function', 'error') +
        '\n\n' +
        `Expected the function not to throw an error matching:\n` +
        `  ${printExpected(expectedError)}\n` +
        printActualErrorMessage(error)
    : () =>
        matcherHint(name, 'function', 'error') +
        '\n\n' +
        `Expected the function to throw an error matching:\n` +
        `  ${printExpected(expectedError)}\n` +
        printActualErrorMessage(error);

  return {message, pass};
};

const toThrowMatchingError = (
  name: string,
  error: ?Error,
  ErrorClass: typeof Error,
) => {
  const pass = !!(error && error instanceof ErrorClass);
  const message = pass
    ? () =>
        matcherHint('.not' + name, 'function', 'type') +
        '\n\n' +
        `Expected the function not to throw an error of type:\n` +
        `  ${printExpected(ErrorClass.name)}\n` +
        printActualErrorMessage(error)
    : () =>
        matcherHint(name, 'function', 'type') +
        '\n\n' +
        `Expected the function to throw an error of type:\n` +
        `  ${printExpected(ErrorClass.name)}\n` +
        printActualErrorMessage(error);

  return {message, pass};
};

const printActualErrorMessage = error => {
  if (error) {
    const {message, stack} = separateMessageFromStack(error.stack);
    return (
      `Instead, it threw:\n` +
      RECEIVED_COLOR(
        '  ' +
          highlightTrailingWhitespace(message) +
          formatStackTrace(
            stack,
            {
              rootDir: process.cwd(),
              testMatch: [],
            },
            {
              noStackTrace: false,
            },
          ),
      )
    );
  }

  return `But it didn't throw anything.`;
};

export default matchers;
