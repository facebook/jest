/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {MatchersObject} from 'types/Matchers';

const CALL_PRINT_LIMIT = 3;
const RETURN_PRINT_LIMIT = 5;
const LAST_CALL_PRINT_LIMIT = 1;
import {
  diff,
  ensureExpectedIsNumber,
  ensureNoExpected,
  EXPECTED_COLOR,
  matcherErrorMessage,
  matcherHint,
  pluralize,
  printExpected,
  printReceived,
  printWithType,
  RECEIVED_COLOR,
} from 'jest-matcher-utils';
import {equals} from './jasmineUtils';
import {iterableEquality, partition, isOneline} from './utils';

const createToBeCalledMatcher = matcherName => (received, expected) => {
  ensureNoExpected(expected, matcherName);
  ensureMock(received, matcherName);

  const receivedIsSpy = isSpy(received);
  const type = receivedIsSpy ? 'spy' : 'mock function';
  const receivedName = receivedIsSpy ? 'spy' : received.getMockName();
  const identifier =
    receivedIsSpy || receivedName === 'jest.fn()'
      ? type
      : `${type} "${receivedName}"`;
  const count = receivedIsSpy
    ? received.calls.count()
    : received.mock.calls.length;
  const calls = receivedIsSpy
    ? received.calls.all().map(x => x.args)
    : received.mock.calls;
  const pass = count > 0;
  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName, '') +
        '\n\n' +
        `Expected ${identifier} not to be called ` +
        formatReceivedCalls(calls, CALL_PRINT_LIMIT, {sameSentence: true})
    : () =>
        matcherHint(matcherName, receivedName, '') +
        '\n\n' +
        `Expected ${identifier} to have been called, but it was not called.`;

  return {message, pass};
};

const createToReturnMatcher = matcherName => (received, expected) => {
  ensureNoExpected(expected, matcherName);
  ensureMock(received, matcherName);

  const receivedName = received.getMockName();
  const identifier =
    receivedName === 'jest.fn()'
      ? 'mock function'
      : `mock function "${receivedName}"`;

  // List of return values that correspond only to calls that returned
  const returnValues = received.mock.results
    .filter(result => result.type === 'return')
    .map(result => result.value);

  const count = returnValues.length;
  const pass = count > 0;

  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName, '') +
        '\n\n' +
        `Expected ${identifier} not to have returned, but it returned:\n` +
        `  ${getPrintedReturnValues(returnValues, RETURN_PRINT_LIMIT)}`
    : () =>
        matcherHint(matcherName, receivedName, '') +
        '\n\n' +
        `Expected ${identifier} to have returned.`;

  return {message, pass};
};

const createToBeCalledTimesMatcher = (matcherName: string) => (
  received: any,
  expected: number,
) => {
  ensureExpectedIsNumber(expected, matcherName);
  ensureMock(received, matcherName);

  const receivedIsSpy = isSpy(received);
  const type = receivedIsSpy ? 'spy' : 'mock function';
  const receivedName = receivedIsSpy ? 'spy' : received.getMockName();
  const identifier =
    receivedIsSpy || receivedName === 'jest.fn()'
      ? type
      : `${type} "${receivedName}"`;
  const count = receivedIsSpy
    ? received.calls.count()
    : received.mock.calls.length;
  const pass = count === expected;
  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName, String(expected)) +
        `\n\n` +
        `Expected ${identifier} not to be called ` +
        `${EXPECTED_COLOR(pluralize('time', expected))}, but it was` +
        ` called exactly ${RECEIVED_COLOR(pluralize('time', count))}.`
    : () =>
        matcherHint(matcherName, receivedName, String(expected)) +
        '\n\n' +
        `Expected ${identifier} to have been called ` +
        `${EXPECTED_COLOR(pluralize('time', expected))},` +
        ` but it was called ${RECEIVED_COLOR(pluralize('time', count))}.`;

  return {message, pass};
};

const createToReturnTimesMatcher = (matcherName: string) => (
  received: any,
  expected: number,
) => {
  ensureExpectedIsNumber(expected, matcherName);
  ensureMock(received, matcherName);

  const receivedName = received.getMockName();
  const identifier =
    receivedName === 'jest.fn()'
      ? 'mock function'
      : `mock function "${receivedName}"`;

  // List of return results that correspond only to calls that returned
  const returnResults = received.mock.results.filter(
    result => result.type === 'return',
  );

  const count = returnResults.length;
  const pass = count === expected;

  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName, String(expected)) +
        `\n\n` +
        `Expected ${identifier} not to have returned ` +
        `${EXPECTED_COLOR(pluralize('time', expected))}, but it` +
        ` returned exactly ${RECEIVED_COLOR(pluralize('time', count))}.`
    : () =>
        matcherHint(matcherName, receivedName, String(expected)) +
        '\n\n' +
        `Expected ${identifier} to have returned ` +
        `${EXPECTED_COLOR(pluralize('time', expected))},` +
        ` but it returned ${RECEIVED_COLOR(pluralize('time', count))}.`;

  return {message, pass};
};

const createToBeCalledWithMatcher = matcherName => (
  received: any,
  ...expected: any
) => {
  ensureMock(received, matcherName);

  const receivedIsSpy = isSpy(received);
  const type = receivedIsSpy ? 'spy' : 'mock function';
  const receivedName = receivedIsSpy ? 'spy' : received.getMockName();
  const identifier =
    receivedIsSpy || receivedName === 'jest.fn()'
      ? type
      : `${type} "${receivedName}"`;

  const calls = receivedIsSpy
    ? received.calls.all().map(x => x.args)
    : received.mock.calls;

  const [match, fail] = partition(calls, call =>
    equals(call, expected, [iterableEquality]),
  );
  const pass = match.length > 0;

  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} not to have been called with:\n` +
        `  ${printExpected(expected)}`
    : () =>
        matcherHint(matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} to have been called with:\n` +
        formatMismatchedCalls(fail, expected, CALL_PRINT_LIMIT);

  return {message, pass};
};

const createToReturnWithMatcher = matcherName => (
  received: any,
  expected: any,
) => {
  ensureMock(received, matcherName);

  const receivedName = received.getMockName();
  const identifier =
    receivedName === 'jest.fn()'
      ? 'mock function'
      : `mock function "${receivedName}"`;

  // List of return values that correspond only to calls that returned
  const returnValues = received.mock.results
    .filter(result => result.type === 'return')
    .map(result => result.value);

  const [match] = partition(returnValues, value =>
    equals(expected, value, [iterableEquality]),
  );
  const pass = match.length > 0;

  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} not to have returned:\n` +
        `  ${printExpected(expected)}\n` +
        `But it returned exactly:\n` +
        `  ${printReceived(expected)}`
    : () =>
        matcherHint(matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} to have returned:\n` +
        formatMismatchedReturnValues(
          returnValues,
          expected,
          RETURN_PRINT_LIMIT,
        );

  return {message, pass};
};

const createLastCalledWithMatcher = matcherName => (
  received: any,
  ...expected: any
) => {
  ensureMock(received, matcherName);

  const receivedIsSpy = isSpy(received);
  const type = receivedIsSpy ? 'spy' : 'mock function';
  const receivedName = receivedIsSpy ? 'spy' : received.getMockName();
  const identifier =
    receivedIsSpy || receivedName === 'jest.fn()'
      ? type
      : `${type} "${receivedName}"`;
  const calls = receivedIsSpy
    ? received.calls.all().map(x => x.args)
    : received.mock.calls;
  const pass = equals(calls[calls.length - 1], expected, [iterableEquality]);

  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} to not have been last called with:\n` +
        `  ${printExpected(expected)}`
    : () =>
        matcherHint(matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} to have been last called with:\n` +
        formatMismatchedCalls(calls, expected, LAST_CALL_PRINT_LIMIT);

  return {message, pass};
};

const createLastReturnedMatcher = matcherName => (
  received: any,
  expected: any,
) => {
  ensureMock(received, matcherName);

  const receivedName = received.getMockName();
  const identifier =
    receivedName === 'jest.fn()'
      ? 'mock function'
      : `mock function "${receivedName}"`;

  const results = received.mock.results;
  const lastResult = results[results.length - 1];
  const pass =
    !!lastResult &&
    lastResult.type === 'return' &&
    equals(lastResult.value, expected, [iterableEquality]);

  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} to not have last returned:\n` +
        `  ${printExpected(expected)}\n` +
        `But it last returned exactly:\n` +
        `  ${printReceived(lastResult.value)}`
    : () =>
        matcherHint(matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} to have last returned:\n` +
        `  ${printExpected(expected)}\n` +
        (!lastResult
          ? `But it was ${RECEIVED_COLOR('not called')}`
          : lastResult.type === 'incomplete'
          ? `But the last call ${RECEIVED_COLOR('has not returned yet')}`
          : lastResult.type === 'throw'
          ? `But the last call ${RECEIVED_COLOR('threw an error')}`
          : `But the last call returned:\n  ${printReceived(
              lastResult.value,
            )}`);

  return {message, pass};
};

const createNthCalledWithMatcher = (matcherName: string) => (
  received: any,
  nth: number,
  ...expected: any
) => {
  ensureMock(received, matcherName);

  const receivedIsSpy = isSpy(received);
  const type = receivedIsSpy ? 'spy' : 'mock function';

  if (typeof nth !== 'number' || parseInt(nth, 10) !== nth || nth < 1) {
    const message = () =>
      `nth value ${printReceived(
        nth,
      )} must be a positive integer greater than ${printExpected(0)}`;
    const pass = false;
    return {message, pass};
  }

  const receivedName = receivedIsSpy ? 'spy' : received.getMockName();
  const identifier =
    receivedIsSpy || receivedName === 'jest.fn()'
      ? type
      : `${type} "${receivedName}"`;
  const calls = receivedIsSpy
    ? received.calls.all().map(x => x.args)
    : received.mock.calls;
  const pass = equals(calls[nth - 1], expected, [iterableEquality]);

  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} ${nthToString(
          nth,
        )} call to not have been called with:\n` +
        `  ${printExpected(expected)}`
    : () =>
        matcherHint(matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} ${nthToString(
          nth,
        )} call to have been called with:\n` +
        formatMismatchedCalls(
          calls[nth - 1] ? [calls[nth - 1]] : [],
          expected,
          LAST_CALL_PRINT_LIMIT,
        );

  return {message, pass};
};

const createNthReturnedWithMatcher = (matcherName: string) => (
  received: any,
  nth: number,
  expected: any,
) => {
  ensureMock(received, matcherName);

  if (typeof nth !== 'number' || parseInt(nth, 10) !== nth || nth < 1) {
    const message = () =>
      `nth value ${printReceived(
        nth,
      )} must be a positive integer greater than ${printExpected(0)}`;
    const pass = false;
    return {message, pass};
  }

  const receivedName = received.getMockName();
  const identifier =
    receivedName === 'jest.fn()'
      ? 'mock function'
      : `mock function "${receivedName}"`;

  const results = received.mock.results;
  const nthResult = results[nth - 1];
  const pass =
    !!nthResult &&
    nthResult.type === 'return' &&
    equals(nthResult.value, expected, [iterableEquality]);
  const nthString = nthToString(nth);
  const message = pass
    ? () =>
        matcherHint('.not' + matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} ${nthString} call to not have returned with:\n` +
        `  ${printExpected(expected)}\n` +
        `But the ${nthString} call returned exactly:\n` +
        `  ${printReceived(nthResult.value)}`
    : () =>
        matcherHint(matcherName, receivedName) +
        '\n\n' +
        `Expected ${identifier} ${nthString} call to have returned with:\n` +
        `  ${printExpected(expected)}\n` +
        (results.length === 0
          ? `But it was ${RECEIVED_COLOR('not called')}`
          : nth > results.length
          ? `But it was only called ${printReceived(results.length)} times`
          : nthResult.type === 'incomplete'
          ? `But the ${nthString} call ${RECEIVED_COLOR(
              'has not returned yet',
            )}`
          : nthResult.type === 'throw'
          ? `But the ${nthString} call ${RECEIVED_COLOR('threw an error')}`
          : `But the ${nthString} call returned with:\n  ${printReceived(
              nthResult.value,
            )}`);

  return {message, pass};
};

const spyMatchers: MatchersObject = {
  lastCalledWith: createLastCalledWithMatcher('.lastCalledWith'),
  lastReturnedWith: createLastReturnedMatcher('.lastReturnedWith'),
  nthCalledWith: createNthCalledWithMatcher('.nthCalledWith'),
  nthReturnedWith: createNthReturnedWithMatcher('.nthReturnedWith'),
  toBeCalled: createToBeCalledMatcher('.toBeCalled'),
  toBeCalledTimes: createToBeCalledTimesMatcher('.toBeCalledTimes'),
  toBeCalledWith: createToBeCalledWithMatcher('.toBeCalledWith'),
  toHaveBeenCalled: createToBeCalledMatcher('.toHaveBeenCalled'),
  toHaveBeenCalledTimes: createToBeCalledTimesMatcher('.toHaveBeenCalledTimes'),
  toHaveBeenCalledWith: createToBeCalledWithMatcher('.toHaveBeenCalledWith'),
  toHaveBeenLastCalledWith: createLastCalledWithMatcher(
    '.toHaveBeenLastCalledWith',
  ),
  toHaveBeenNthCalledWith: createNthCalledWithMatcher(
    '.toHaveBeenNthCalledWith',
  ),
  toHaveLastReturnedWith: createLastReturnedMatcher('.toHaveLastReturnedWith'),
  toHaveNthReturnedWith: createNthReturnedWithMatcher('.toHaveNthReturnedWith'),
  toHaveReturned: createToReturnMatcher('.toHaveReturned'),
  toHaveReturnedTimes: createToReturnTimesMatcher('.toHaveReturnedTimes'),
  toHaveReturnedWith: createToReturnWithMatcher('.toHaveReturnedWith'),
  toReturn: createToReturnMatcher('.toReturn'),
  toReturnTimes: createToReturnTimesMatcher('.toReturnTimes'),
  toReturnWith: createToReturnWithMatcher('.toReturnWith'),
};

const isSpy = spy => spy.calls && typeof spy.calls.count === 'function';

const ensureMock = (mockOrSpy, matcherName) => {
  if (
    !mockOrSpy ||
    ((mockOrSpy.calls === undefined || mockOrSpy.calls.all === undefined) &&
      mockOrSpy._isMockFunction !== true)
  ) {
    throw new Error(
      matcherErrorMessage(
        matcherHint('[.not]' + matcherName, 'jest.fn()', ''),
        `${RECEIVED_COLOR('received')} value must be a mock or spy function`,
        printWithType('Received', mockOrSpy, printReceived),
      ),
    );
  }
};

const getPrintedCalls = (
  calls: any[],
  limit: number,
  sep: string,
  fn: Function,
): string => {
  const result = [];
  let i = calls.length;

  while (--i >= 0 && --limit >= 0) {
    result.push(fn(calls[i]));
  }

  return result.join(sep);
};

const getPrintedReturnValues = (calls: any[], limit: number): string => {
  const result = [];

  for (let i = 0; i < calls.length && i < limit; i += 1) {
    result.push(printReceived(calls[i]));
  }

  if (calls.length > limit) {
    result.push(`...and ${printReceived(calls.length - limit)} more`);
  }

  return result.join('\n\n  ');
};

const formatReceivedCalls = (calls, limit, options) => {
  if (calls.length) {
    const but = options && options.sameSentence ? 'but' : 'But';
    const count = calls.length - limit;
    const printedCalls = getPrintedCalls(calls, limit, ', ', printReceived);
    return (
      `${but} it was called ` +
      `with:\n  ` +
      printedCalls +
      (count > 0
        ? '\nand ' + RECEIVED_COLOR(pluralize('more call', count)) + '.'
        : '')
    );
  } else {
    return `But it was ${RECEIVED_COLOR('not called')}.`;
  }
};

const formatMismatchedCalls = (calls, expected, limit) => {
  if (calls.length) {
    return getPrintedCalls(
      calls,
      limit,
      '\n\n',
      formatMismatchedArgs.bind(null, expected),
    );
  } else {
    return (
      `  ${printExpected(expected)}\n` +
      `But it was ${RECEIVED_COLOR('not called')}.`
    );
  }
};

const formatMismatchedReturnValues = (returnValues, expected, limit) => {
  if (returnValues.length) {
    return (
      `  ${printExpected(expected)}\n` +
      `But it returned:\n` +
      `  ${getPrintedReturnValues(returnValues, limit)}`
    );
  } else {
    return (
      `  ${printExpected(expected)}\n` +
      `But it did ${RECEIVED_COLOR('not return')}.`
    );
  }
};

const formatMismatchedArgs = (expected, received) => {
  const length = Math.max(expected.length, received.length);

  const printedArgs = [];
  for (let i = 0; i < length; i++) {
    if (!equals(expected[i], received[i], [iterableEquality])) {
      const oneline = isOneline(expected[i], received[i]);
      const diffString = diff(expected[i], received[i]);
      printedArgs.push(
        `  ${printExpected(expected[i])}\n` +
          `as argument ${i + 1}, but it was called with\n` +
          `  ${printReceived(received[i])}.` +
          (diffString && !oneline ? `\n\nDifference:\n\n${diffString}` : ''),
      );
    } else if (i >= expected.length) {
      printedArgs.push(
        `  Did not expect argument ${i + 1} ` +
          `but it was called with ${printReceived(received[i])}.`,
      );
    }
  }

  return printedArgs.join('\n');
};

const nthToString = (nth: number) => {
  switch (nth) {
    case 1:
      return 'first';
    case 2:
      return 'second';
    case 3:
      return 'third';
  }
  return `${nth}th`;
};

export default spyMatchers;
