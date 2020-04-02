/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import deepCyclicCopyReplaceable from '../deepCyclicCopyReplaceable';

test('returns the same value for primitive or function values', () => {
  const fn = () => {};

  expect(deepCyclicCopyReplaceable(undefined)).toBe(undefined);
  expect(deepCyclicCopyReplaceable(null)).toBe(null);
  expect(deepCyclicCopyReplaceable(true)).toBe(true);
  expect(deepCyclicCopyReplaceable(42)).toBe(42);
  expect(Number.isNaN(deepCyclicCopyReplaceable(NaN))).toBe(true);
  expect(deepCyclicCopyReplaceable('foo')).toBe('foo');
  expect(deepCyclicCopyReplaceable(fn)).toBe(fn);
});

test('copies symbols', () => {
  const symbol = Symbol('foo');
  const obj = {[symbol]: 42};

  expect(deepCyclicCopyReplaceable(obj)[symbol]).toBe(42);
});

test('copies arrays as array objects', () => {
  const array = [null, 42, 'foo', 'bar', [], {}];

  expect(deepCyclicCopyReplaceable(array)).toEqual(array);
  expect(Array.isArray(deepCyclicCopyReplaceable(array))).toBe(true);
});

test('handles cyclic dependencies', () => {
  const cyclic: any = {a: 42, subcycle: {}};

  cyclic.subcycle.baz = cyclic;
  cyclic.bar = cyclic;

  expect(() => deepCyclicCopyReplaceable(cyclic)).not.toThrow();

  const copy = deepCyclicCopyReplaceable(cyclic);

  expect(copy.a).toBe(42);
  expect(copy.bar).toEqual(copy);
  expect(copy.subcycle.baz).toEqual(copy);
});

test('Copy Map', () => {
  const map = new Map([
    ['a', 1],
    ['b', 2],
  ]);
  const copy = deepCyclicCopyReplaceable(map);
  expect(copy).toEqual(map);
  expect(copy.constructor).toBe(Map);
});

test('Copy cyclic Map', () => {
  const map: Map<any, any> = new Map([
    ['a', 1],
    ['b', 2],
  ]);
  map.set('map', map);
  expect(deepCyclicCopyReplaceable(map)).toEqual(map);
});

test('return same value for built-in object type except array, map and object', () => {
  const date = new Date();
  const buffer = Buffer.from('jest');
  const numberArray = new Uint8Array([1, 2, 3]);
  const regexp = /jest/;
  const set = new Set(['foo', 'bar']);

  expect(deepCyclicCopyReplaceable(date)).toBe(date);
  expect(deepCyclicCopyReplaceable(buffer)).toBe(buffer);
  expect(deepCyclicCopyReplaceable(numberArray)).toBe(numberArray);
  expect(deepCyclicCopyReplaceable(regexp)).toBe(regexp);
  expect(deepCyclicCopyReplaceable(set)).toBe(set);
});
