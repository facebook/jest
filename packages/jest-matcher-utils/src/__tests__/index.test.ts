/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  diff,
  ensureNumbers,
  ensureNoExpected,
  getLabelPrinter,
  pluralize,
  stringify,
} from '../';

describe('.stringify()', () => {
  [
    [[], '[]'],
    [{}, '{}'],
    [1, '1'],
    [0, '0'],
    [1.5, '1.5'],
    [null, 'null'],
    [undefined, 'undefined'],
    ['abc', '"abc"'],
    [Symbol.for('abc'), 'Symbol(abc)'],
    [NaN, 'NaN'],
    [Infinity, 'Infinity'],
    [-Infinity, '-Infinity'],
    [/ab\.c/gi, '/ab\\.c/gi'],
  ].forEach(([v, s]) => {
    test(stringify(v), () => {
      expect(stringify(v)).toBe(s);
    });
  });

  test('circular references', () => {
    const a: any = {};
    a.a = a;
    expect(stringify(a)).toBe('{"a": [Circular]}');
  });

  test('toJSON error', () => {
    const evil = {
      toJSON() {
        throw new Error('Nope.');
      },
    };
    expect(stringify(evil)).toBe('{"toJSON": [Function toJSON]}');
    expect(stringify({a: {b: {evil}}})).toBe(
      '{"a": {"b": {"evil": {"toJSON": [Function toJSON]}}}}',
    );

    function Evil() {}
    Evil.toJSON = evil.toJSON;
    expect(stringify(Evil)).toBe('[Function Evil]');
  });

  test('toJSON errors when comparing two objects', () => {
    function toJSON() {
      throw new Error('Nope.');
    }
    const evilA = {
      a: 1,
      toJSON,
    };
    const evilB = {
      b: 1,
      toJSON,
    };

    expect(() => expect(evilA).toEqual(evilB)).toThrowErrorMatchingSnapshot();
  });

  test('reduces maxDepth if stringifying very large objects', () => {
    const big: any = {a: 1, b: {}};
    const small: any = {a: 1, b: {}};
    for (let i = 0; i < 10000; i += 1) {
      big.b[i] = 'test';
    }

    for (let i = 0; i < 10; i += 1) {
      small.b[i] = 'test';
    }

    expect(stringify(big)).toMatchSnapshot();
    expect(stringify(small)).toMatchSnapshot();
  });
});

describe('.ensureNumbers()', () => {
  test('dont throw error when variables are numbers', () => {
    expect(() => {
      // @ts-ignore
      ensureNumbers(1, 2);
    }).not.toThrow();
  });

  test('throws error when expected is not a number', () => {
    expect(() => {
      // @ts-ignore
      ensureNumbers(1, 'not_a_number');
    }).toThrowErrorMatchingSnapshot();
  });

  test('throws error when received is not a number', () => {
    expect(() => {
      // @ts-ignore
      ensureNumbers('not_a_number', 3);
    }).toThrowErrorMatchingSnapshot();
  });
});

describe('.ensureNoExpected()', () => {
  test('dont throw error when undefined', () => {
    expect(() => {
      // @ts-ignore
      ensureNoExpected(undefined);
    }).not.toThrow();
  });

  test('throws error when expected is not undefined with matcherName', () => {
    expect(() => {
      ensureNoExpected({a: 1}, '.toBeDefined');
    }).toThrowErrorMatchingSnapshot();
  });

  test('throws error when expected is not undefined with matcherName and options', () => {
    expect(() => {
      ensureNoExpected({a: 1}, 'toBeDefined', {isNot: true});
    }).toThrowErrorMatchingSnapshot();
  });
});

jest.mock('jest-diff', () => () => 'diff output');
describe('diff', () => {
  test('forwards to jest-diff', () => {
    [
      ['a', 'b'],
      ['a', {}],
      ['a', null],
      ['a', undefined],
      ['a', 1],
      ['a', true],
      [1, true],
    ].forEach(([actual, expected]) =>
      expect(diff(actual, expected)).toBe('diff output'),
    );
  });

  test('two booleans', () => {
    expect(diff(false, true)).toBe(null);
  });

  test('two numbers', () => {
    expect(diff(1, 2)).toBe(null);
  });
});

describe('.pluralize()', () => {
  test('one', () => expect(pluralize('apple', 1)).toEqual('one apple'));
  test('two', () => expect(pluralize('apple', 2)).toEqual('two apples'));
  test('20', () => expect(pluralize('apple', 20)).toEqual('20 apples'));
});

describe('getLabelPrinter', () => {
  test('0 args', () => {
    const printLabel = getLabelPrinter();
    expect(printLabel('')).toBe(': ');
  });
  test('1 empty string', () => {
    const printLabel = getLabelPrinter();
    expect(printLabel('')).toBe(': ');
  });
  test('1 non-empty string', () => {
    const string = 'Expected';
    const printLabel = getLabelPrinter(string);
    expect(printLabel(string)).toBe('Expected: ');
  });
  test('2 equal lengths', () => {
    const stringExpected = 'Expected value';
    const collectionType = 'array';
    const stringReceived = `Received ${collectionType}`;
    const printLabel = getLabelPrinter(stringExpected, stringReceived);
    expect(printLabel(stringExpected)).toBe('Expected value: ');
    expect(printLabel(stringReceived)).toBe('Received array: ');
  });
  test('2 unequal lengths', () => {
    const stringExpected = 'Expected value';
    const collectionType = 'set';
    const stringReceived = `Received ${collectionType}`;
    const printLabel = getLabelPrinter(stringExpected, stringReceived);
    expect(printLabel(stringExpected)).toBe('Expected value: ');
    expect(printLabel(stringReceived)).toBe('Received set:   ');
  });
  test('returns incorrect padding if inconsistent arg is shorter', () => {
    const stringConsistent = 'Expected';
    const stringInconsistent = 'Received value';
    const stringInconsistentShorter = 'Received set';
    const printLabel = getLabelPrinter(stringConsistent, stringInconsistent);
    expect(printLabel(stringConsistent)).toBe('Expected:       ');
    expect(printLabel(stringInconsistentShorter)).toBe('Received set:   ');
  });
  test('throws if inconsistent arg is longer', () => {
    const stringConsistent = 'Expected';
    const stringInconsistent = 'Received value';
    const stringInconsistentLonger = 'Received string';
    const printLabel = getLabelPrinter(stringConsistent, stringInconsistent);
    expect(printLabel(stringConsistent)).toBe('Expected:       ');
    expect(() => {
      printLabel(stringInconsistentLonger);
    }).toThrow();
  });
});
