/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {MatcherHintOptions, MatchersObject} from 'types/Matchers';

import {formatStackTrace, separateMessageFromStack} from 'jest-message-util';
import {
  EXPECTED_COLOR,
  RECEIVED_COLOR,
  matcherErrorMessage,
  matcherHint,
  printExpected,
  printReceived,
  printWithType,
} from 'jest-matcher-utils';
import {isError} from './utils';

const DID_NOT_THROW = 'Received function did not throw';

type Thrown =
  | {
      hasMessage: true,
      isError: true,
      message: string,
      value: Error,
    }
  | {
      hasMessage: boolean,
      isError: false,
      message: string,
      value: any,
    };

const getThrown = (e: any): Thrown => {
  const hasMessage =
    e !== null && e !== undefined && typeof e.message === 'string';

  if (hasMessage && typeof e.name === 'string' && typeof e.stack === 'string') {
    return {
      hasMessage,
      isError: true,
      message: e.message,
      value: e,
    };
  }

  return {
    hasMessage,
    isError: false,
    message: hasMessage ? e.message : String(e),
    value: e,
  };
};

export const createMatcher = (matcherName: string, fromPromise?: boolean) =>
  function(received: Function, expected: any) {
    const options = {
      isNot: this.isNot,
      promise: this.promise,
    };

    let thrown = null;

    if (fromPromise && isError(received)) {
      thrown = getThrown(received);
    } else {
      if (typeof received !== 'function') {
        if (!fromPromise) {
          const placeholder = expected === undefined ? '' : 'expected';
          throw new Error(
            matcherErrorMessage(
              matcherHint(matcherName, undefined, placeholder, options),
              `${RECEIVED_COLOR('received')} value must be a function`,
              printWithType('Received', received, printReceived),
            ),
          );
        }
      } else {
        try {
          received();
        } catch (e) {
          thrown = getThrown(e);
        }
      }
    }

    if (expected === undefined) {
      return toThrow(matcherName, options, thrown);
    } else if (typeof expected === 'function') {
      return toThrowExpectedClass(matcherName, options, thrown, expected);
    } else if (typeof expected === 'string') {
      return toThrowExpectedString(matcherName, options, thrown, expected);
    } else if (expected !== null && typeof expected.test === 'function') {
      return toThrowExpectedRegExp(matcherName, options, thrown, expected);
    } else if (
      expected !== null &&
      typeof expected.asymmetricMatch === 'function'
    ) {
      return toThrowExpectedAsymmetric(matcherName, options, thrown, expected);
    } else if (expected !== null && typeof expected === 'object') {
      return toThrowExpectedObject(matcherName, options, thrown, expected);
    } else {
      throw new Error(
        matcherErrorMessage(
          matcherHint(matcherName, undefined, undefined, options),
          `${EXPECTED_COLOR(
            'expected',
          )} value must be a string or regular expression or class or error`,
          printWithType('Expected', expected, printExpected),
        ),
      );
    }
  };

const matchers: MatchersObject = {
  toThrow: createMatcher('toThrow'),
  toThrowError: createMatcher('toThrowError'),
};

const toThrowExpectedRegExp = (
  matcherName: string,
  options: MatcherHintOptions,
  thrown: Thrown | null,
  expected: RegExp,
) => {
  const pass = thrown !== null && expected.test(thrown.message);

  const message = pass
    ? () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected pattern: ', expected) +
        (thrown !== null && thrown.hasMessage
          ? formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value:   ', thrown, 'value'))
    : () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected pattern: ', expected) +
        (thrown === null
          ? '\n' + DID_NOT_THROW
          : thrown.hasMessage
          ? formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value:   ', thrown, 'value'));

  return {message, pass};
};

type AsymmetricMatcher = {
  asymmetricMatch: (received: any) => boolean,
};

const toThrowExpectedAsymmetric = (
  matcherName: string,
  options: MatcherHintOptions,
  thrown: Thrown | null,
  expected: AsymmetricMatcher,
) => {
  const pass = thrown !== null && expected.asymmetricMatch(thrown.value);

  const message = pass
    ? () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected asymmetric matcher: ', expected) +
        '\n' +
        (thrown !== null && thrown.hasMessage
          ? formatReceived('Received name:    ', thrown, 'name') +
            formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Thrown value: ', thrown, 'value'))
    : () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected asymmetric matcher: ', expected) +
        '\n' +
        (thrown === null
          ? DID_NOT_THROW
          : thrown.hasMessage
          ? formatReceived('Received name:    ', thrown, 'name') +
            formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Thrown value: ', thrown, 'value'));

  return {message, pass};
};

const toThrowExpectedObject = (
  matcherName: string,
  options: MatcherHintOptions,
  thrown: Thrown | null,
  expected: Object,
) => {
  const pass = thrown !== null && thrown.message === expected.message;

  const message = pass
    ? () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected message: ', expected.message) +
        (thrown !== null && thrown.hasMessage
          ? formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value:   ', thrown, 'value'))
    : () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected message: ', expected.message) +
        (thrown === null
          ? '\n' + DID_NOT_THROW
          : thrown.hasMessage
          ? formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value:   ', thrown, 'value'));

  return {message, pass};
};

const toThrowExpectedClass = (
  matcherName: string,
  options: MatcherHintOptions,
  thrown: Thrown | null,
  expected: Function,
) => {
  const pass = thrown !== null && thrown.value instanceof expected;

  const message = pass
    ? () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected name: ', expected.name) +
        formatReceived('Received name: ', thrown, 'name') +
        '\n' +
        (thrown !== null && thrown.hasMessage
          ? formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value: ', thrown, 'value'))
    : () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected name: ', expected.name) +
        (thrown === null
          ? '\n' + DID_NOT_THROW
          : thrown.hasMessage
          ? formatReceived('Received name: ', thrown, 'name') +
            '\n' +
            formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : '\n' + formatReceived('Received value: ', thrown, 'value'));

  return {message, pass};
};

const toThrowExpectedString = (
  matcherName: string,
  options: MatcherHintOptions,
  thrown: Thrown | null,
  expected: string,
) => {
  const pass = thrown !== null && thrown.message.includes(expected);

  const message = pass
    ? () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected substring: ', expected) +
        (thrown !== null && thrown.hasMessage
          ? formatReceived('Received message:   ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value:     ', thrown, 'value'))
    : () =>
        matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        formatExpected('Expected substring: ', expected) +
        (thrown === null
          ? '\n' + DID_NOT_THROW
          : thrown.hasMessage
          ? formatReceived('Received message:   ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value:     ', thrown, 'value'));

  return {message, pass};
};

const toThrow = (
  matcherName: string,
  options: MatcherHintOptions,
  thrown: Thrown | null,
) => {
  const pass = thrown !== null;

  const message = pass
    ? () =>
        matcherHint(matcherName, undefined, '', options) +
        '\n\n' +
        (thrown !== null && thrown.hasMessage
          ? formatReceived('Error name:    ', thrown, 'name') +
            formatReceived('Error message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Thrown value: ', thrown, 'value'))
    : () =>
        matcherHint(matcherName, undefined, '', options) +
        '\n\n' +
        DID_NOT_THROW;

  return {message, pass};
};

const formatExpected = (label: string, expected: any) =>
  label + printExpected(expected) + '\n';

const formatReceived = (label: string, thrown: Thrown | null, key: string) => {
  if (thrown === null) {
    return '';
  }

  if (key === 'message') {
    return label + printReceived(thrown.message) + '\n';
  }

  if (key === 'name') {
    return thrown.isError
      ? label + printReceived(thrown.value.name) + '\n'
      : '';
  }

  if (key === 'value') {
    return thrown.isError ? '' : label + printReceived(thrown.value) + '\n';
  }

  return '';
};

const formatStack = (thrown: Thrown | null) =>
  thrown === null || !thrown.isError
    ? ''
    : formatStackTrace(
        separateMessageFromStack(thrown.value.stack).stack,
        {
          rootDir: process.cwd(),
          testMatch: [],
        },
        {
          noStackTrace: false,
        },
      );

export default matchers;
