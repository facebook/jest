/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

it.each`
  left    | right
  ${true} | ${true}
  ${true}
`(
  'throws exception when one argument too few are supplied $left == $right',
  ({left, right}) => {
    expect(left).toBe(right);
  }
);

it.each`
  left    | right   | up | down
  ${true} | ${true}
`(
  'throws exception when not enough arguments are supplied $left == $right',
  ({left, right}) => {
    expect(left).toBe(right);
  }
);
