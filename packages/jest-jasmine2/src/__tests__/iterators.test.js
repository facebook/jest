/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

describe('iterators', () => {
  it('works for arrays', () => {
    const mixedArray = [1, {}, []];

    expect(mixedArray).toEqual(mixedArray);
    expect([1, 2, 3]).toEqual([1, 2, 3]);
    expect([1]).not.toEqual([2]);
    expect([1, 2, 3]).not.toEqual([1, 2]);
    expect([1, 2, 3]).not.toEqual([1, 2, 3, 4]);
  });

  it('works for custom iterables', () => {
    const iterable = {
      0: 'a',
      1: 'b',
      2: 'c',
      length: 3,
      [Symbol.iterator]: Array.prototype[Symbol.iterator],
    };
    const expectedIterable = {
      0: 'a',
      1: 'b',
      2: 'c',
      length: 3,
      [Symbol.iterator]: Array.prototype[Symbol.iterator],
    };
    expect(iterable).toEqual(expectedIterable);
    expect(iterable).not.toEqual(['a', 'b']);
    expect(iterable).not.toEqual(['a', 'b', 'c']);
    expect(iterable).not.toEqual(['a', 'b', 'c', 'd']);
  });

  it('works for Sets', () => {
    const numbers = [1, 2, 3, 4];
    const setOfNumbers = new Set(numbers);
    expect(setOfNumbers).not.toEqual(new Set());
    expect(setOfNumbers).not.toBe(numbers);
    expect(setOfNumbers).not.toEqual([1, 2]);
    expect(setOfNumbers).not.toEqual([1, 2, 3]);
    expect(setOfNumbers).toEqual(new Set(numbers));

    const nestedSets = new Set([new Set([1, 2])]);
    expect(nestedSets).not.toEqual(new Set([new Set([1, 4])]));
    expect(nestedSets).toEqual(new Set([new Set([1, 2])]));
  });

  it('works for Maps', () => {
    const keyValuePairs = [['key1', 'value1'], ['key2', 'value2']];
    const smallerKeyValuePairs = [['key1', 'value1']];
    const biggerKeyValuePairs = [
      ['key1', 'value1'],
      ['key2', 'value2'],
      ['key3', 'value3'],
    ];
    const map = new Map(keyValuePairs);
    expect(map).not.toEqual(smallerKeyValuePairs);
    expect(map).not.toEqual(new Map(smallerKeyValuePairs));
    expect(map).not.toEqual(biggerKeyValuePairs);
    expect(map).not.toEqual(new Map(biggerKeyValuePairs));
    expect(map).not.toEqual(keyValuePairs);
    expect(map).not.toBe(keyValuePairs);
    expect(map).toEqual(new Map(keyValuePairs));
  });
});
