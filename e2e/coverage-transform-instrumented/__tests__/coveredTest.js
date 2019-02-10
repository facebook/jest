/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const doES6Stuff = require('../covered.js');

it('works correctly', () => {
  const someObj = {someNumber: 10, this: 'is irrelevant'};
  expect(doES6Stuff(someObj, 2)).toBe(20);
});
