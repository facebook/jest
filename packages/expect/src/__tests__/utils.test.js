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
  iterableEquality,
} = require('../utils');

describe('getPath()', () => {
  test('property exists', () => {
    expect(getPath({a: {b: {c: 5}}}, 'a.b.c')).toEqual({
      endPropIsDefined: true,
      hasEndProp: true,
      lastTraversedObject: {c: 5},
      traversedPath: ['a', 'b', 'c'],
      value: 5,
    });

    expect(getPath({a: {b: {c: {d: 1}}}}, 'a.b.c.d')).toEqual({
      endPropIsDefined: true,
      hasEndProp: true,
      lastTraversedObject: {d: 1},
      traversedPath: ['a', 'b', 'c', 'd'],
      value: 1,
    });
  });

  test('property doesnt exist', () => {
    expect(getPath({a: {b: {}}}, 'a.b.c')).toEqual({
      endPropIsDefined: false,
      hasEndProp: false,
      lastTraversedObject: {},
      traversedPath: ['a', 'b'],
      value: undefined,
    });
  });

  test('property exist but undefined', () => {
    expect(getPath({a: {b: {c: undefined}}}, 'a.b.c')).toEqual({
      endPropIsDefined: true,
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
      endPropIsDefined: true,
      hasEndProp: true,
      lastTraversedObject: new A(),
      traversedPath: ['a'],
      value: 'a',
    });
    expect(getPath(new A(), 'b.c')).toEqual({
      endPropIsDefined: true,
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
      endPropIsDefined: true,
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
      endPropIsDefined: false,
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

  describe('calculating subsets of objects with circular references', () => {
    test('simple circular references', () => {
      const nonCircularObj = {a: 'world', b: 'something'};

      const circularObjA = {a: 'hello'};
      circularObjA.ref = circularObjA;

      const circularObjB = {a: 'world'};
      circularObjB.ref = circularObjB;

      const primitiveInsteadOfRef = {b: 'something'};
      primitiveInsteadOfRef.ref = 'not a ref';

      const nonCircularRef = {b: 'something'};
      nonCircularRef.ref = {};

      expect(getObjectSubset(circularObjA, nonCircularObj)).toEqual({
        a: 'hello',
      });
      expect(getObjectSubset(nonCircularObj, circularObjA)).toEqual({
        a: 'world',
      });

      expect(getObjectSubset(circularObjB, circularObjA)).toEqual(circularObjB);

      expect(getObjectSubset(primitiveInsteadOfRef, circularObjA)).toEqual({
        ref: 'not a ref',
      });
      expect(getObjectSubset(nonCircularRef, circularObjA)).toEqual({
        ref: {},
      });
    });

    test('transitive circular references', () => {
      const nonCircularObj = {a: 'world', b: 'something'};

      const transitiveCircularObjA = {a: 'hello'};
      transitiveCircularObjA.nestedObj = {parentObj: transitiveCircularObjA};

      const transitiveCircularObjB = {a: 'world'};
      transitiveCircularObjB.nestedObj = {parentObj: transitiveCircularObjB};

      const primitiveInsteadOfRef = {};
      primitiveInsteadOfRef.nestedObj = {otherProp: 'not the parent ref'};

      const nonCircularRef = {};
      nonCircularRef.nestedObj = {otherProp: {}};

      expect(getObjectSubset(transitiveCircularObjA, nonCircularObj)).toEqual({
        a: 'hello',
      });
      expect(getObjectSubset(nonCircularObj, transitiveCircularObjA)).toEqual({
        a: 'world',
      });

      expect(
        getObjectSubset(transitiveCircularObjB, transitiveCircularObjA),
      ).toEqual(transitiveCircularObjB);

      expect(
        getObjectSubset(primitiveInsteadOfRef, transitiveCircularObjA),
      ).toEqual({nestedObj: {otherProp: 'not the parent ref'}});
      expect(getObjectSubset(nonCircularRef, transitiveCircularObjA)).toEqual({
        nestedObj: {otherProp: {}},
      });
    });
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

  describe('matching subsets with circular references', () => {
    test('simple circular references', () => {
      const circularObjA1 = {a: 'hello'};
      circularObjA1.ref = circularObjA1;

      const circularObjA2 = {a: 'hello'};
      circularObjA2.ref = circularObjA2;

      const circularObjB = {a: 'world'};
      circularObjB.ref = circularObjB;

      const primitiveInsteadOfRef = {};
      primitiveInsteadOfRef.ref = 'not a ref';

      expect(subsetEquality(circularObjA1, {})).toBe(true);
      expect(subsetEquality({}, circularObjA1)).toBe(false);
      expect(subsetEquality(circularObjA2, circularObjA1)).toBe(true);
      expect(subsetEquality(circularObjB, circularObjA1)).toBe(false);
      expect(subsetEquality(primitiveInsteadOfRef, circularObjA1)).toBe(false);
    });

    test('transitive circular references', () => {
      const transitiveCircularObjA1 = {a: 'hello'};
      transitiveCircularObjA1.nestedObj = {parentObj: transitiveCircularObjA1};

      const transitiveCircularObjA2 = {a: 'hello'};
      transitiveCircularObjA2.nestedObj = {
        parentObj: transitiveCircularObjA2,
      };

      const transitiveCircularObjB = {a: 'world'};
      transitiveCircularObjB.nestedObj = {
        parentObj: transitiveCircularObjB,
      };

      const primitiveInsteadOfRef = {};
      primitiveInsteadOfRef.nestedObj = {
        parentObj: 'not the parent ref',
      };

      expect(subsetEquality(transitiveCircularObjA1, {})).toBe(true);
      expect(subsetEquality({}, transitiveCircularObjA1)).toBe(false);
      expect(
        subsetEquality(transitiveCircularObjA2, transitiveCircularObjA1),
      ).toBe(true);
      expect(
        subsetEquality(transitiveCircularObjB, transitiveCircularObjA1),
      ).toBe(false);
      expect(
        subsetEquality(primitiveInsteadOfRef, transitiveCircularObjA1),
      ).toBe(false);
    });
  });
});

describe('iterableEquality', () => {
  test('returns true when given circular iterators', () => {
    class Iter {
      *[Symbol.iterator]() {
        yield this;
      }
    }

    const a = new Iter();
    const b = new Iter();

    expect(iterableEquality(a, b)).toBe(true);
  });

  test('returns true when given circular Set', () => {
    const a = new Set();
    a.add(a);
    const b = new Set();
    b.add(b);
    expect(iterableEquality(a, b)).toBe(true);
  });

  test('returns true when given nested Sets', () => {
    expect(
      iterableEquality(
        new Set([new Set([[1]]), new Set([[2]])]),
        new Set([new Set([[2]]), new Set([[1]])]),
      ),
    ).toBe(true);
    expect(
      iterableEquality(
        new Set([new Set([[1]]), new Set([[2]])]),
        new Set([new Set([[3]]), new Set([[1]])]),
      ),
    ).toBe(false);
  });

  test('returns false when given inequal set within a set', () => {
    expect(
      iterableEquality(new Set([new Set([2])]), new Set([new Set([1, 2])])),
    ).toBe(false);
    expect(
      iterableEquality(new Set([new Set([2])]), new Set([new Set([1, 2])])),
    ).toBe(false);
  });

  test('returns false when given inequal map within a set', () => {
    expect(
      iterableEquality(
        new Set([new Map([['a', 2]])]),
        new Set([new Map([['a', 3]])]),
      ),
    ).toBe(false);
    expect(
      iterableEquality(new Set([new Set([2])]), new Set([new Set([1, 2])])),
    ).toBe(false);
  });

  test('returns false when given inequal set within a map', () => {
    expect(
      iterableEquality(
        new Map([['one', new Set([2])]]),
        new Map([['one', new Set([1, 2])]]),
      ),
    ).toBe(false);
  });

  test('returns true when given circular Set shape', () => {
    const a1 = new Set();
    const a2 = new Set();
    a1.add(a2);
    a2.add(a1);
    const b = new Set();
    b.add(b);

    expect(iterableEquality(a1, b)).toBe(true);
  });

  test('returns true when given circular key in Map', () => {
    const a = new Map();
    a.set(a, 'a');
    const b = new Map();
    b.set(b, 'a');

    expect(iterableEquality(a, b)).toBe(true);
  });

  test('returns true when given nested Maps', () => {
    expect(
      iterableEquality(
        new Map([['hello', new Map([['world', 'foobar']])]]),
        new Map([['hello', new Map([['world', 'qux']])]]),
      ),
    ).toBe(false);
    expect(
      iterableEquality(
        new Map([['hello', new Map([['world', 'foobar']])]]),
        new Map([['hello', new Map([['world', 'foobar']])]]),
      ),
    ).toBe(true);
  });

  test('returns true when given circular key and value in Map', () => {
    const a = new Map();
    a.set(a, a);
    const b = new Map();
    b.set(b, b);

    expect(iterableEquality(a, b)).toBe(true);
  });

  test('returns true when given circular value in Map', () => {
    const a = new Map();
    a.set('a', a);
    const b = new Map();
    b.set('a', b);

    expect(iterableEquality(a, b)).toBe(true);
  });
});
