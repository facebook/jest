/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

test.each(['red', 'green', 'bean'])(
  "The word %s contains the letter 'e'",
  word => {
    expect(/e/.test(word)).toBe(true);
  }
);

it.each([[true, true], [true, true]])(
  'passes one row expected %s == %s',
  (left, right) => {
    expect(left).toBe(right);
  }
);

it.each([[true, true], [true, true]])(
  'passes all rows expected %s == %s',
  (left, right) => {
    expect(left).toBe(right);
  }
);

describe.each([[true, true], [true, true]])(
  'passes all rows expected %s == %s',
  (left, right) => {
    it('passes', () => {
      expect(left).toBe(right);
    });
  }
);

it.each`
  left    | right
  ${true} | ${true}
  ${true} | ${true}
`('passes one row expected $left == $right', ({left, right}) => {
  expect(left).toBe(right);
});

it.each`
  left    | right
  ${true} | ${true}
  ${true} | ${true}
`('passes all rows expected $left == $right', ({left, right}) => {
  expect(left).toBe(right);
});

describe.each`
  left    | right
  ${true} | ${true}
  ${true} | ${true}
`('passes all rows expected $left == $right', ({left, right}) => {
  it('passes ', () => {
    expect(left).toBe(right);
  });
});
