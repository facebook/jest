/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const {stringify} = require('jest-matcher-utils');
const {
  emptyObject,
  getObjectSubset,
  getPath,
  hasOwnProperty,
  subsetEquality,
} = require('../utils');

describe('getPath()', () => {
  test('property exists', () => {
    expect(getPath({a: {b: {c: 5}}}, 'a.b.c')).toEqual({
      hasEndProp: true,
      lastTraversedObject: {c: 5},
      traversedPath: ['a', 'b', 'c'],
      value: 5,
    });

    expect(getPath({a: {b: {c: {d: 1}}}}, 'a.b.c.d')).toEqual({
      hasEndProp: true,
      lastTraversedObject: {d: 1},
      traversedPath: ['a', 'b', 'c', 'd'],
      value: 1,
    });
  });

  test('property doesnt exist', () => {
    expect(getPath({a: {b: {}}}, 'a.b.c')).toEqual({
      hasEndProp: false,
      lastTraversedObject: {},
      traversedPath: ['a', 'b'],
      value: undefined,
    });
  });

  test('property exist but undefined', () => {
    expect(getPath({a: {b: {c: undefined}}}, 'a.b.c')).toEqual({
      hasEndProp: true,
      lastTraversedObject: {c: undefined},
      traversedPath: ['a', 'b', 'c'],
      value: undefined,
    });
  });

  test('property is a getter on class instance', () => {
    class A {
      get a() {
        return 'a';
      }
      get b() {
        return {c: 'c'};
      }
    }

    expect(getPath(new A(), 'a')).toEqual({
      hasEndProp: true,
      lastTraversedObject: new A(),
      traversedPath: ['a'],
      value: 'a',
    });
    expect(getPath(new A(), 'b.c')).toEqual({
      hasEndProp: true,
      lastTraversedObject: {c: 'c'},
      traversedPath: ['b', 'c'],
      value: 'c',
    });
  });

  test('property is inherited', () => {
    class A {}
    A.prototype.a = 'a';

    expect(getPath(new A(), 'a')).toEqual({
      hasEndProp: true,
      lastTraversedObject: new A(),
      traversedPath: ['a'],
      value: 'a',
    });
  });

  test('path breaks', () => {
    expect(getPath({a: {}}, 'a.b.c')).toEqual({
      hasEndProp: false,
      lastTraversedObject: {},
      traversedPath: ['a'],
      value: undefined,
    });
  });

  test('empty object at the end', () => {
    expect(getPath({a: {b: {c: {}}}}, 'a.b.c.d')).toEqual({
      hasEndProp: false,
      lastTraversedObject: {},
      traversedPath: ['a', 'b', 'c'],
      value: undefined,
    });
  });
});

describe('hasOwnProperty', () => {
  it('does inherit getter from class', () => {
    class MyClass {
      get key() {
        return 'value';
      }
    }
    expect(hasOwnProperty(new MyClass(), 'key')).toBe(true);
  });

  it('does not inherit setter from class', () => {
    class MyClass {
      set key(value) {}
    }
    expect(hasOwnProperty(new MyClass(), 'key')).toBe(false);
  });

  it('does not inherit method from class', () => {
    class MyClass {
      key() {}
    }
    expect(hasOwnProperty(new MyClass(), 'key')).toBe(false);
  });

  it('does not inherit property from constructor prototype', () => {
    function MyClass() {}
    MyClass.prototype.key = 'value';
    expect(hasOwnProperty(new MyClass(), 'key')).toBe(false);
  });

  it('does not inherit __proto__ getter from Object', () => {
    expect(hasOwnProperty({}, '__proto__')).toBe(false);
  });

  it('does not inherit toString method from Object', () => {
    expect(hasOwnProperty({}, 'toString')).toBe(false);
  });
});

describe('getObjectSubset()', () => {
  [
    [{a: 'b', c: 'd'}, {a: 'd'}, {a: 'b'}],
    [{a: [1, 2], b: 'b'}, {a: [3, 4]}, {a: [1, 2]}],
    [[{a: 'b', c: 'd'}], [{a: 'z'}], [{a: 'b'}]],
    [[1, 2], [1, 2, 3], [1, 2]],
    [{a: [1]}, {a: [1, 2]}, {a: [1]}],
    [new Date('2015-11-30'), new Date('2016-12-30'), new Date('2015-11-30')],
  ].forEach(([object, subset, expected]) => {
    test(
      `expect(getObjectSubset(${stringify(object)}, ${stringify(subset)}))` +
        `.toEqual(${stringify(expected)})`,
      () => {
        expect(getObjectSubset(object, subset)).toEqual(expected);
      },
    );
  });
});

describe('emptyObject()', () => {
  test('matches an empty object', () => {
    expect(emptyObject({})).toBe(true);
  });

  test('does not match an object with keys', () => {
    expect(emptyObject({foo: undefined})).toBe(false);
  });

  test('does not match a non-object', () => {
    expect(emptyObject(null)).toBe(false);
    expect(emptyObject(34)).toBe(false);
  });
});

describe('subsetEquality()', () => {
  test('matching object returns true', () => {
    expect(subsetEquality({foo: 'bar'}, {foo: 'bar'})).toBe(true);
  });

  test('object without keys is undefined', () => {
    expect(subsetEquality('foo', 'bar')).toBe(undefined);
  });

  test('objects to not match', () => {
    expect(subsetEquality({foo: 'bar'}, {foo: 'baz'})).toBe(false);
    expect(subsetEquality('foo', {foo: 'baz'})).toBe(false);
  });

  test('null does not return errors', () => {
    expect(subsetEquality(null, {foo: 'bar'})).not.toBeTruthy();
  });

  test('undefined does not return errors', () => {
    expect(subsetEquality(undefined, {foo: 'bar'})).not.toBeTruthy();
  });
});
