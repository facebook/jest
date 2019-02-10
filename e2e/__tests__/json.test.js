/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

test('JSON is available in the global scope', () => {
  expect(JSON).toBe(global.JSON);
});

test('JSON.parse creates objects from within this context', () => {
  expect(JSON.parse('{}').constructor).toBe(Object);
});
