/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

test('fake promises', () => {
  let someValue;
  Promise.resolve().then(() => {
    someValue = 'foobar';
  });

  jest.runAllImmediates();

  expect(someValue).toBe('foobar');
});
