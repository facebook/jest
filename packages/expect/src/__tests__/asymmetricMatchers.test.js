/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const jestExpect = require('../');
const {
  any,
  anything,
  arrayContaining,
  arrayNotContaining,
  objectContaining,
  objectNotContaining,
  stringContaining,
  stringNotContaining,
  stringMatching,
  stringNotMatching,
} = require('../asymmetricMatchers');

test('Any.asymmetricMatch()', () => {
  const Thing = function() {};

  [
    any(String).asymmetricMatch('jest'),
    any(Number).asymmetricMatch(1),
    any(Function).asymmetricMatch(() => {}),
    any(Boolean).asymmetricMatch(true),
    any(Object).asymmetricMatch({}),
    any(Array).asymmetricMatch([]),
    any(Thing).asymmetricMatch(new Thing()),
  ].forEach(test => {
    jestExpect(test).toBe(true);
  });
});

test('Any.toAsymmetricMatcher()', () => {
  jestExpect(any(Number).toAsymmetricMatcher()).toBe('Any<Number>');
});

test('Any throws when called with empty constructor', () => {
  jestExpect(() => any()).toThrow();
});

test('Anything matches any type', () => {
  [
    anything().asymmetricMatch('jest'),
    anything().asymmetricMatch(1),
    anything().asymmetricMatch(() => {}),
    anything().asymmetricMatch(true),
    anything().asymmetricMatch({}),
    anything().asymmetricMatch([]),
  ].forEach(test => {
    jestExpect(test).toBe(true);
  });
});

test('Anything does not match null and undefined', () => {
  [
    anything().asymmetricMatch(null),
    anything().asymmetricMatch(undefined),
  ].forEach(test => {
    jestExpect(test).toBe(false);
  });
});

test('Anything.toAsymmetricMatcher()', () => {
  jestExpect(anything().toAsymmetricMatcher()).toBe('Anything');
});

test('ArrayContaining matches', () => {
  [
    arrayContaining([]).asymmetricMatch('jest'),
    arrayContaining(['foo']).asymmetricMatch(['foo']),
    arrayContaining(['foo']).asymmetricMatch(['foo', 'bar']),
    arrayContaining([]).asymmetricMatch({}),
  ].forEach(test => {
    jestExpect(test).toEqual(true);
  });
});

test('ArrayContaining does not match', () => {
  jestExpect(arrayContaining(['foo']).asymmetricMatch(['bar'])).toBe(false);
});

test('ArrayContaining throws for non-arrays', () => {
  jestExpect(() => {
    arrayContaining('foo').asymmetricMatch([]);
  }).toThrow();
});

test('ArrayNotContaining matches', () => {
  jestExpect(arrayNotContaining(['foo']).asymmetricMatch(['bar'])).toBe(true);
});

test('ArrayNotContaining does not match', () => {
  [
    arrayNotContaining([]).asymmetricMatch('jest'),
    arrayNotContaining(['foo']).asymmetricMatch(['foo']),
    arrayNotContaining(['foo']).asymmetricMatch(['foo', 'bar']),
    arrayNotContaining([]).asymmetricMatch({}),
  ].forEach(test => {
    jestExpect(test).toEqual(false);
  });
});

test('ArrayNotContaining throws for non-arrays', () => {
  jestExpect(() => {
    arrayNotContaining('foo').asymmetricMatch([]);
  }).toThrow();
});

test('ObjectContaining matches', () => {
  [
    objectContaining({}).asymmetricMatch('jest'),
    objectContaining({foo: 'foo'}).asymmetricMatch({foo: 'foo', jest: 'jest'}),
    objectContaining({foo: undefined}).asymmetricMatch({foo: undefined}),
    objectContaining({first: objectContaining({second: {}})}).asymmetricMatch({
      first: {second: {}},
    }),
  ].forEach(test => {
    jestExpect(test).toEqual(true);
  });
});

test('ObjectContaining does not match', () => {
  [
    objectContaining({foo: 'foo'}).asymmetricMatch({bar: 'bar'}),
    objectContaining({foo: 'foo'}).asymmetricMatch({foo: 'foox'}),
    objectContaining({foo: undefined}).asymmetricMatch({}),
  ].forEach(test => {
    jestExpect(test).toEqual(false);
  });
});

test('ObjectContaining matches defined properties', () => {
  const definedPropertyObject = {};
  Object.defineProperty(definedPropertyObject, 'foo', {get: () => 'bar'});
  jestExpect(
    objectContaining({foo: 'bar'}).asymmetricMatch(definedPropertyObject),
  ).toBe(true);
});

test('ObjectContaining matches prototype properties', () => {
  const prototypeObject = {foo: 'bar'};
  let obj;

  if (Object.create) {
    obj = Object.create(prototypeObject);
  } else {
    function Foo() {}
    Foo.prototype = prototypeObject;
    Foo.prototype.constructor = Foo;
    obj = new Foo();
  }
  jestExpect(objectContaining({foo: 'bar'}).asymmetricMatch(obj)).toBe(true);
});

test('ObjectContaining throws for non-objects', () => {
  jestExpect(() => objectContaining(1337).asymmetricMatch()).toThrow();
});

test('ObjectNotContaining matches', () => {
  [
    objectNotContaining({}).asymmetricMatch('jest'),
    objectNotContaining({foo: 'foo'}).asymmetricMatch({bar: 'bar'}),
    objectNotContaining({foo: 'foo'}).asymmetricMatch({foo: 'foox'}),
    objectNotContaining({foo: undefined}).asymmetricMatch({}),
  ].forEach(test => {
    jestExpect(test).toEqual(true);
  });
});

test('ObjectNotContaining does not match', () => {
  [
    objectNotContaining({foo: 'foo'}).asymmetricMatch({
      foo: 'foo',
      jest: 'jest',
    }),
    objectNotContaining({foo: undefined}).asymmetricMatch({foo: undefined}),
    objectNotContaining({
      first: objectNotContaining({second: {}}),
    }).asymmetricMatch({first: {second: {}}}),
  ].forEach(test => {
    jestExpect(test).toEqual(false);
  });
});

test('ObjectNotContaining throws for non-objects', () => {
  jestExpect(() => objectNotContaining(1337).asymmetricMatch()).toThrow();
});

test('StringContaining matches string against string', () => {
  jestExpect(stringContaining('en*').asymmetricMatch('queen*')).toBe(true);
  jestExpect(stringContaining('en').asymmetricMatch('queue')).toBe(false);
});

test('StringContaining throws if expected value is not string', () => {
  jestExpect(() => {
    stringContaining([1]).asymmetricMatch('queen');
  }).toThrow();
});

test('StringContaining returns false if received value is not string', () => {
  jestExpect(stringContaining('en*').asymmetricMatch(1)).toBe(false);
});

test('StringNotContaining matches string against string', () => {
  jestExpect(stringNotContaining('en*').asymmetricMatch('queen*')).toBe(false);
  jestExpect(stringNotContaining('en').asymmetricMatch('queue')).toBe(true);
});

test('StringNotContaining throws if expected value is not string', () => {
  jestExpect(() => {
    stringNotContaining([1]).asymmetricMatch('queen');
  }).toThrow();
});

test('StringNotContaining returns true if received value is not string', () => {
  jestExpect(stringNotContaining('en*').asymmetricMatch(1)).toBe(true);
});

test('StringMatching matches string against regexp', () => {
  jestExpect(stringMatching(/en/).asymmetricMatch('queen')).toBe(true);
  jestExpect(stringMatching(/en/).asymmetricMatch('queue')).toBe(false);
});

test('StringMatching matches string against string', () => {
  jestExpect(stringMatching('en').asymmetricMatch('queen')).toBe(true);
  jestExpect(stringMatching('en').asymmetricMatch('queue')).toBe(false);
});

test('StringMatching throws if expected value is neither string nor regexp', () => {
  jestExpect(() => {
    stringMatching([1]).asymmetricMatch('queen');
  }).toThrow();
});

test('StringMatching returns false if received value is not string', () => {
  jestExpect(stringMatching('en').asymmetricMatch(1)).toBe(false);
});

test('StringMatching returns false even if coerced non-string received value matches pattern', () => {
  jestExpect(stringMatching('null').asymmetricMatch(null)).toBe(false);
});

test('StringNotMatching matches string against regexp', () => {
  jestExpect(stringNotMatching(/en/).asymmetricMatch('queen')).toBe(false);
  jestExpect(stringNotMatching(/en/).asymmetricMatch('queue')).toBe(true);
});

test('StringNotMatching matches string against string', () => {
  jestExpect(stringNotMatching('en').asymmetricMatch('queen')).toBe(false);
  jestExpect(stringNotMatching('en').asymmetricMatch('queue')).toBe(true);
});

test('StringNotMatching throws if expected value is neither string nor regexp', () => {
  jestExpect(() => {
    stringNotMatching([1]).asymmetricMatch('queen');
  }).toThrow();
});

test('StringNotMatching returns true if received value is not string', () => {
  jestExpect(stringNotMatching('en').asymmetricMatch(1)).toBe(true);
});
