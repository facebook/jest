/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable jest/no-focused-tests */

it.only.each([[true, true], [true, true]])(
  'passes one row expected %s == %s',
  (left, right) => {
    expect(left).toBe(right);
  }
);

it.each([[true, false], [true, true]])(
  'Should not be ran: fails all rows expected %s == %s',
  (left, right) => {
    expect(left).toBe(right);
  }
);

it.only.each`
  left    | right
  ${true} | ${true}
  ${true} | ${true}
`('passes one row expected $left == $right', ({left, right}) => {
  expect(left).toBe(right);
});

it.each`
  left    | right
  ${true} | ${false}
  ${true} | ${false}
`(
  'Should not be ran: fails all rows expected $left == $right',
  ({left, right}) => {
    expect(left).toBe(right);
  }
);
