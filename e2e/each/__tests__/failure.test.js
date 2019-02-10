/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

it.each([[true, true], [true, false]])(
  'array table fails on one row: expected %s == %s',
  (left, right) => {
    expect(left).toBe(right);
  }
);

it.each([[1, 2], [3, 4]])(
  'array table fails on all rows expected %s == %s',
  (left, right) => {
    expect(left).toBe(right);
  }
);

it.each`
  left    | right
  ${true} | ${false}
  ${true} | ${true}
`(
  'template table fails on one row expected: $left == $right',
  ({left, right}) => {
    expect(left).toBe(right);
  }
);

it.each`
  left | right
  ${1} | ${2}
  ${3} | ${4}
`(
  'template table fails on all rows expected: $left == $right',
  ({left, right}) => {
    expect(left).toBe(right);
  }
);

test.each(['red', 'green', 'bean'])(
  "The word %s contains the letter 'z'",
  word => {
    expect(/z/.test(word)).toBe(true);
  }
);

describe.each`
  left   | right
  ${'a'} | ${'b'}
  ${'c'} | ${'d'}
`(
  'template table describe fails on all rows expected "$left" == "$right"',
  ({left, right}) => {
    it('fails ', () => {
      expect(left).toBe(right);
    });
  }
);

describe.each([['a', 'b'], ['c', 'd']])(
  'array table describe fails on all rows expected %s == %s',
  (left, right) => {
    it('fails', () => {
      expect(left).toBe(right);
    });
  }
);
