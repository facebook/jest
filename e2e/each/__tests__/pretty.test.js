/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const noop = () => {};

describe('array', () => {
  it.each([
    ['hello', 'hello'],
    [1, 1],
    [null, null],
    [undefined, undefined],
    [1.2, 1.2],
    [{foo: 'bar'}, {foo: 'bar'}],
    [{foo: {bar: 'baz'}}, {foo: {bar: 'baz'}}],
    [noop, noop],
    [[], []],
    [[{foo: {bar: 'baz'}}], [{foo: {bar: 'baz'}}]],
    [Infinity, Infinity],
    [-Infinity, -Infinity],
    [NaN, NaN],
  ])('%p == %p', (left, right) => {
    expect(left).toEqual(right);
  });
});

describe('template', () => {
  it.each`
    left                     | right
    ${'hello'}               | ${'hello'}
    ${1}                     | ${1}
    ${null}                  | ${null}
    ${undefined}             | ${undefined}
    ${1.2}                   | ${1.2}
    ${{foo: 'bar'}}          | ${{foo: 'bar'}}
    ${{foo: {bar: 'baz'}}}   | ${{foo: {bar: 'baz'}}}
    ${noop}                  | ${noop}
    ${[]}                    | ${[]}
    ${[{foo: {bar: 'baz'}}]} | ${[{foo: {bar: 'baz'}}]}
    ${Infinity}              | ${Infinity}
    ${-Infinity}             | ${-Infinity}
    ${NaN}                   | ${NaN}
  `('$left == $right', ({left, right}) => {
    expect(left).toEqual(right);
  });
});
