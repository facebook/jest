/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {MatchersObject} from 'types/Matchers';

import getType from 'jest-get-type';
import {escapeStrForRegex} from 'jest-regex-util';
import {
  EXPECTED_COLOR,
  RECEIVED_COLOR,
  SUGGEST_TO_EQUAL,
  SUGGEST_TO_CONTAIN_EQUAL,
  diff,
  ensureNoExpected,
  ensureNumbers,
  getLabelPrinter,
  matcherErrorMessage,
  matcherHint,
  printReceived,
  printExpected,
  printWithType,
} from 'jest-matcher-utils';
import {
  getObjectSubset,
  getPath,
  iterableEquality,
  sparseArrayEquality,
  subsetEquality,
  typeEquality,
  isOneline,
} from './utils';
import {equals} from './jasmineUtils';

type ContainIterable =
  | Array<any>
  | Set<any>
  | NodeList<any>
  | DOMTokenList
  | HTMLCollection<any>;

const matchers: MatchersObject = {
  toBe(received: any, expected: any) {
    const comment = 'Object.is equality';
    const pass = Object.is(received, expected);

    const message = pass
      ? () =>
          matcherHint('.toBe', undefined, undefined, {
            comment,
            isNot: true,
          }) +
          '\n\n' +
          `Expected: ${printExpected(expected)}\n` +
          `Received: ${printReceived(received)}`
      : () => {
          const receivedType = getType(received);
          const expectedType = getType(expected);
          const suggestToEqual =
            receivedType === expectedType &&
            (receivedType === 'object' || expectedType === 'array') &&
            equals(received, expected, [iterableEquality]);
          const oneline = isOneline(expected, received);
          const diffString = diff(expected, received, {expand: this.expand});

          return (
            matcherHint('.toBe', undefined, undefined, {
              comment,
              isNot: false,
            }) +
            '\n\n' +
            `Expected: ${printExpected(expected)}\n` +
            `Received: ${printReceived(received)}` +
            (diffString && !oneline ? `\n\nDifference:\n\n${diffString}` : '') +
            (suggestToEqual ? ` ${SUGGEST_TO_EQUAL}` : '')
          );
        };

    // Passing the actual and expected objects so that a custom reporter
    // could access them, for example in order to display a custom visual diff,
    // or create a different error message
    return {actual: received, expected, message, name: 'toBe', pass};
  },

  toBeCloseTo(actual: number, expected: number, precision?: number = 2) {
    const secondArgument = arguments.length === 3 ? 'precision' : null;
    ensureNumbers(actual, expected, '.toBeCloseTo');

    let pass = false;

    if (actual == Infinity && expected == Infinity) pass = true;
    else if (actual == -Infinity && expected == -Infinity) pass = true;
    else pass = Math.abs(expected - actual) < Math.pow(10, -precision) / 2;

    const message = () =>
      matcherHint('.toBeCloseTo', undefined, undefined, {
        isNot: this.isNot,
        secondArgument,
      }) +
      '\n\n' +
      `Precision: ${printExpected(precision)}-digit\n` +
      `Expected:  ${printExpected(expected)}\n` +
      `Received:  ${printReceived(actual)}`;

    return {message, pass};
  },

  toBeDefined(received: any, expected: void) {
    const options = {
      isNot: this.isNot,
      promise: this.promise,
    };
    ensureNoExpected(expected, 'toBeDefined', options);

    const pass = received !== void 0;

    const message = () =>
      matcherHint('toBeDefined', undefined, '', options) +
      '\n\n' +
      `Received: ${printReceived(received)}`;

    return {message, pass};
  },

  toBeFalsy(received: any, expected: void) {
    const options = {
      isNot: this.isNot,
      promise: this.promise,
    };
    ensureNoExpected(expected, 'toBeFalsy', options);

    const pass = !received;

    const message = () =>
      matcherHint('toBeFalsy', undefined, '', options) +
      '\n\n' +
      `Received: ${printReceived(received)}`;

    return {message, pass};
  },

  toBeGreaterThan(actual: number, expected: number) {
    ensureNumbers(actual, expected, '.toBeGreaterThan');
    const pass = actual > expected;
    const message = () =>
      matcherHint('.toBeGreaterThan', undefined, undefined, {
        isNot: this.isNot,
      }) +
      '\n\n' +
      `Expected: ${printExpected(expected)}\n` +
      `Received: ${printReceived(actual)}`;
    return {message, pass};
  },

  toBeGreaterThanOrEqual(actual: number, expected: number) {
    ensureNumbers(actual, expected, '.toBeGreaterThanOrEqual');
    const pass = actual >= expected;
    const message = () =>
      matcherHint('.toBeGreaterThanOrEqual', undefined, undefined, {
        isNot: this.isNot,
      }) +
      '\n\n' +
      `Expected: ${printExpected(expected)}\n` +
      `Received: ${printReceived(actual)}`;
    return {message, pass};
  },

  toBeInstanceOf(received: any, constructor: Function) {
    const constType = getType(constructor);

    if (constType !== 'function') {
      throw new Error(
        matcherErrorMessage(
          matcherHint('.toBeInstanceOf', undefined, undefined, {
            isNot: this.isNot,
          }),
          `${EXPECTED_COLOR('expected')} value must be a function`,
          printWithType('Expected', constructor, printExpected),
        ),
      );
    }
    const pass = received instanceof constructor;

    const message = pass
      ? () =>
          matcherHint('.toBeInstanceOf', 'value', 'constructor', {
            isNot: this.isNot,
          }) +
          '\n\n' +
          `Expected constructor: ${EXPECTED_COLOR(
            constructor.name || String(constructor),
          )}\n` +
          `Received value: ${printReceived(received)}`
      : () =>
          matcherHint('.toBeInstanceOf', 'value', 'constructor', {
            isNot: this.isNot,
          }) +
          '\n\n' +
          `Expected constructor: ${EXPECTED_COLOR(
            constructor.name || String(constructor),
          )}\n` +
          `Received constructor: ${RECEIVED_COLOR(
            received != null
              ? received.constructor && received.constructor.name
              : '',
          )}\n` +
          `Received value: ${printReceived(received)}`;

    return {message, pass};
  },

  toBeLessThan(actual: number, expected: number) {
    ensureNumbers(actual, expected, '.toBeLessThan');
    const pass = actual < expected;
    const message = () =>
      matcherHint('.toBeLessThan', undefined, undefined, {
        isNot: this.isNot,
      }) +
      '\n\n' +
      `Expected: ${printExpected(expected)}\n` +
      `Received: ${printReceived(actual)}`;
    return {message, pass};
  },

  toBeLessThanOrEqual(actual: number, expected: number) {
    ensureNumbers(actual, expected, '.toBeLessThanOrEqual');
    const pass = actual <= expected;
    const message = () =>
      matcherHint('.toBeLessThanOrEqual', undefined, undefined, {
        isNot: this.isNot,
      }) +
      '\n\n' +
      `Expected: ${printExpected(expected)}\n` +
      `Received: ${printReceived(actual)}`;
    return {message, pass};
  },

  toBeNaN(received: any, expected: void) {
    const options = {
      isNot: this.isNot,
      promise: this.promise,
    };
    ensureNoExpected(expected, 'toBeNaN', options);

    const pass = Number.isNaN(received);

    const message = () =>
      matcherHint('toBeNaN', undefined, '', options) +
      '\n\n' +
      `Received: ${printReceived(received)}`;

    return {message, pass};
  },

  toBeNull(received: any, expected: void) {
    const options = {
      isNot: this.isNot,
      promise: this.promise,
    };
    ensureNoExpected(expected, 'toBeNull', options);

    const pass = received === null;

    const message = () =>
      matcherHint('toBeNull', undefined, '', options) +
      '\n\n' +
      `Received: ${printReceived(received)}`;

    return {message, pass};
  },

  toBeTruthy(received: any, expected: void) {
    const options = {
      isNot: this.isNot,
      promise: this.promise,
    };
    ensureNoExpected(expected, 'toBeTruthy', options);

    const pass = !!received;

    const message = () =>
      matcherHint('toBeTruthy', undefined, '', options) +
      '\n\n' +
      `Received: ${printReceived(received)}`;

    return {message, pass};
  },

  toBeUndefined(received: any, expected: void) {
    const options = {
      isNot: this.isNot,
      promise: this.promise,
    };
    ensureNoExpected(expected, 'toBeUndefined', options);

    const pass = received === void 0;

    const message = () =>
      matcherHint('toBeUndefined', undefined, '', options) +
      '\n\n' +
      `Received: ${printReceived(received)}`;

    return {message, pass};
  },

  toContain(collection: ContainIterable | string, value: any) {
    const collectionType = getType(collection);

    let converted = null;
    if (Array.isArray(collection) || typeof collection === 'string') {
      // strings have `indexOf` so we don't need to convert
      // arrays have `indexOf` and we don't want to make a copy
      converted = collection;
    } else {
      try {
        converted = Array.from(collection);
      } catch (e) {
        throw new Error(
          matcherErrorMessage(
            matcherHint('.toContain', undefined, undefined, {
              isNot: this.isNot,
            }),
            `${RECEIVED_COLOR(
              'received',
            )} value must not be null nor undefined`,
            printWithType('Received', collection, printReceived),
          ),
        );
      }
    }
    // At this point, we're either a string or an Array,
    // which was converted from an array-like structure.
    const pass = converted.indexOf(value) != -1;
    const message = () => {
      const stringExpected = 'Expected value';
      const stringReceived = `Received ${collectionType}`;
      const printLabel = getLabelPrinter(stringExpected, stringReceived);
      const suggestToContainEqual =
        !pass &&
        converted !== null &&
        typeof converted !== 'string' &&
        converted instanceof Array &&
        converted.findIndex(item => equals(item, value, [iterableEquality])) !==
          -1;

      return (
        matcherHint('.toContain', collectionType, 'value', {
          comment: 'indexOf',
          isNot: this.isNot,
        }) +
        '\n\n' +
        `${printLabel(stringExpected)}${printExpected(value)}\n` +
        `${printLabel(stringReceived)}${printReceived(collection)}` +
        (suggestToContainEqual ? `\n\n${SUGGEST_TO_CONTAIN_EQUAL}` : '')
      );
    };

    return {message, pass};
  },

  toContainEqual(collection: ContainIterable, value: any) {
    const collectionType = getType(collection);
    let converted = null;
    if (Array.isArray(collection)) {
      converted = collection;
    } else {
      try {
        converted = Array.from(collection);
      } catch (e) {
        throw new Error(
          matcherErrorMessage(
            matcherHint('.toContainEqual', undefined, undefined, {
              isNot: this.isNot,
            }),
            `${RECEIVED_COLOR(
              'received',
            )} value must not be null nor undefined`,
            printWithType('Received', collection, printReceived),
          ),
        );
      }
    }

    const pass =
      converted.findIndex(item => equals(item, value, [iterableEquality])) !==
      -1;
    const message = () => {
      const stringExpected = 'Expected value';
      const stringReceived = `Received ${collectionType}`;
      const printLabel = getLabelPrinter(stringExpected, stringReceived);

      return (
        matcherHint('.toContainEqual', collectionType, 'value', {
          comment: 'deep equality',
          isNot: this.isNot,
        }) +
        '\n\n' +
        `${printLabel(stringExpected)}${printExpected(value)}\n` +
        `${printLabel(stringReceived)}${printReceived(collection)}`
      );
    };

    return {message, pass};
  },

  toEqual(received: any, expected: any) {
    const pass = equals(received, expected, [iterableEquality]);

    const message = pass
      ? () =>
          matcherHint('.toEqual', undefined, undefined, {
            isNot: this.isNot,
          }) +
          '\n\n' +
          `Expected: ${printExpected(expected)}\n` +
          `Received: ${printReceived(received)}`
      : () => {
          const diffString = diff(expected, received, {expand: this.expand});

          return (
            matcherHint('.toEqual', undefined, undefined, {
              isNot: this.isNot,
            }) +
            '\n\n' +
            (diffString && diffString.includes('- Expect')
              ? `Difference:\n\n${diffString}`
              : `Expected: ${printExpected(expected)}\n` +
                `Received: ${printReceived(received)}`)
          );
        };

    // Passing the actual and expected objects so that a custom reporter
    // could access them, for example in order to display a custom visual diff,
    // or create a different error message
    return {actual: received, expected, message, name: 'toEqual', pass};
  },

  toHaveLength(received: any, length: number) {
    if (
      typeof received !== 'string' &&
      (!received || typeof received.length !== 'number')
    ) {
      throw new Error(
        matcherErrorMessage(
          matcherHint('.toHaveLength', undefined, undefined, {
            isNot: this.isNot,
          }),
          `${RECEIVED_COLOR(
            'received',
          )} value must have a length property whose value must be a number`,
          printWithType('Received', received, printReceived),
        ),
      );
    }

    if (typeof length !== 'number') {
      throw new Error(
        matcherErrorMessage(
          matcherHint('.toHaveLength', undefined, undefined, {
            isNot: this.isNot,
          }),
          `${EXPECTED_COLOR('expected')} value must be a number`,
          printWithType('Expected', length, printExpected),
        ),
      );
    }

    const pass = received.length === length;
    const message = () => {
      const stringExpected = 'Expected length';
      const stringReceivedLength = 'Received length';
      const stringReceivedValue = `Received ${getType(received)}`;
      const printLabel = getLabelPrinter(
        stringExpected,
        stringReceivedLength,
        stringReceivedValue,
      );

      return (
        matcherHint('.toHaveLength', 'received', 'length', {
          isNot: this.isNot,
        }) +
        '\n\n' +
        `${printLabel(stringExpected)}${printExpected(length)}\n` +
        `${printLabel(stringReceivedLength)}${printReceived(
          received.length,
        )}\n` +
        `${printLabel(stringReceivedValue)}${printReceived(received)}`
      );
    };

    return {message, pass};
  },

  toHaveProperty(object: Object, keyPath: string | Array<any>, value?: any) {
    const valuePassed = arguments.length === 3;
    const secondArgument = valuePassed ? 'value' : null;

    if (object === null || object === undefined) {
      throw new Error(
        matcherErrorMessage(
          matcherHint('.toHaveProperty', undefined, 'path', {
            isNot: this.isNot,
            secondArgument,
          }),
          `${RECEIVED_COLOR('received')} value must not be null nor undefined`,
          printWithType('Received', object, printReceived),
        ),
      );
    }

    const keyPathType = getType(keyPath);

    if (keyPathType !== 'string' && keyPathType !== 'array') {
      throw new Error(
        matcherErrorMessage(
          matcherHint('.toHaveProperty', undefined, 'path', {
            isNot: this.isNot,
            secondArgument,
          }),
          `${EXPECTED_COLOR('expected')} path must be a string or array`,
          printWithType('Expected', keyPath, printExpected),
        ),
      );
    }

    const result = getPath(object, keyPath);
    const {lastTraversedObject, hasEndProp} = result;

    const pass = valuePassed
      ? equals(result.value, value, [iterableEquality])
      : hasEndProp;

    const traversedPath = result.traversedPath.join('.');

    const message = pass
      ? () =>
          matcherHint('.not.toHaveProperty', 'object', 'path', {
            secondArgument,
          }) +
          '\n\n' +
          `Expected the object:\n` +
          `  ${printReceived(object)}\n` +
          `Not to have a nested property:\n` +
          `  ${printExpected(keyPath)}\n` +
          (valuePassed ? `With a value of:\n  ${printExpected(value)}\n` : '')
      : () => {
          const diffString =
            valuePassed && hasEndProp
              ? diff(value, result.value, {expand: this.expand})
              : '';
          return (
            matcherHint('.toHaveProperty', 'object', 'path', {
              secondArgument,
            }) +
            '\n\n' +
            `Expected the object:\n` +
            `  ${printReceived(object)}\n` +
            `To have a nested property:\n` +
            `  ${printExpected(keyPath)}\n` +
            (valuePassed
              ? `With a value of:\n  ${printExpected(value)}\n`
              : '') +
            (hasEndProp
              ? `Received:\n` +
                `  ${printReceived(result.value)}` +
                (diffString ? `\n\nDifference:\n\n${diffString}` : '')
              : traversedPath
              ? `Received:\n  ${RECEIVED_COLOR(
                  'object',
                )}.${traversedPath}: ${printReceived(lastTraversedObject)}`
              : '')
          );
        };
    if (pass === undefined) {
      throw new Error('pass must be initialized');
    }

    return {message, pass};
  },

  toMatch(received: string, expected: string | RegExp) {
    if (typeof received !== 'string') {
      throw new Error(
        matcherErrorMessage(
          matcherHint('.toMatch', undefined, undefined, {
            isNot: this.isNot,
          }),
          `${RECEIVED_COLOR('received')} value must be a string`,
          printWithType('Received', received, printReceived),
        ),
      );
    }

    if (
      !(expected && typeof expected.test === 'function') &&
      !(typeof expected === 'string')
    ) {
      throw new Error(
        matcherErrorMessage(
          matcherHint('.toMatch', undefined, undefined, {
            isNot: this.isNot,
          }),
          `${EXPECTED_COLOR(
            'expected',
          )} value must be a string or regular expression`,
          printWithType('Expected', expected, printExpected),
        ),
      );
    }

    const pass = new RegExp(
      typeof expected === 'string' ? escapeStrForRegex(expected) : expected,
    ).test(received);
    const message = pass
      ? () =>
          matcherHint('.not.toMatch') +
          `\n\nExpected value not to match:\n` +
          `  ${printExpected(expected)}` +
          `\nReceived:\n` +
          `  ${printReceived(received)}`
      : () =>
          matcherHint('.toMatch') +
          `\n\nExpected value to match:\n` +
          `  ${printExpected(expected)}` +
          `\nReceived:\n` +
          `  ${printReceived(received)}`;

    return {message, pass};
  },

  toMatchObject(receivedObject: Object, expectedObject: Object) {
    if (typeof receivedObject !== 'object' || receivedObject === null) {
      throw new Error(
        matcherErrorMessage(
          matcherHint('.toMatchObject', undefined, undefined, {
            isNot: this.isNot,
          }),
          `${RECEIVED_COLOR('received')} value must be a non-null object`,
          printWithType('Received', receivedObject, printReceived),
        ),
      );
    }

    if (typeof expectedObject !== 'object' || expectedObject === null) {
      throw new Error(
        matcherErrorMessage(
          matcherHint('.toMatchObject', undefined, undefined, {
            isNot: this.isNot,
          }),
          `${EXPECTED_COLOR('expected')} value must be a non-null object`,
          printWithType('Expected', expectedObject, printExpected),
        ),
      );
    }

    const pass = equals(receivedObject, expectedObject, [
      iterableEquality,
      subsetEquality,
    ]);

    const message = pass
      ? () =>
          matcherHint('.not.toMatchObject') +
          `\n\nExpected value not to match object:\n` +
          `  ${printExpected(expectedObject)}` +
          `\nReceived:\n` +
          `  ${printReceived(receivedObject)}`
      : () => {
          const diffString = diff(
            expectedObject,
            getObjectSubset(receivedObject, expectedObject),
            {
              expand: this.expand,
            },
          );
          return (
            matcherHint('.toMatchObject') +
            `\n\nExpected value to match object:\n` +
            `  ${printExpected(expectedObject)}` +
            `\nReceived:\n` +
            `  ${printReceived(receivedObject)}` +
            (diffString ? `\nDifference:\n${diffString}` : '')
          );
        };

    return {message, pass};
  },

  toStrictEqual(received: any, expected: any) {
    const pass = equals(
      received,
      expected,
      [iterableEquality, typeEquality, sparseArrayEquality],
      true,
    );

    const hint = matcherHint('.toStrictEqual', undefined, undefined, {
      isNot: this.isNot,
    });
    const message = pass
      ? () =>
          hint +
          '\n\n' +
          `Expected: ${printExpected(expected)}\n` +
          `Received: ${printReceived(received)}`
      : () => {
          const diffString = diff(expected, received, {
            expand: this.expand,
          });
          return hint + (diffString ? `\n\nDifference:\n\n${diffString}` : '');
        };

    // Passing the actual and expected objects so that a custom reporter
    // could access them, for example in order to display a custom visual diff,
    // or create a different error message
    return {actual: received, expected, message, name: 'toStrictEqual', pass};
  },
};

export default matchers;
