/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

it('passes', () => {
  expect(10).toBe(10);
});

it('fails', () => {
  expect(10).toBe(101);
});

it.skip('skips', () => {
  expect(10).toBe(101);
});

it.todo('todo');
