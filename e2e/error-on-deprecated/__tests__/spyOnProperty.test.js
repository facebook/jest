/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

/* globals spyOnProperty */

const myObject = {};
Object.defineProperties(myObject, {
  name: () => 'Jordan',
});

test('spyOnProperty', () => {
  let isOriginalCalled = false;
  const obj = {
    get method() {
      return () => (isOriginalCalled = true);
    },
  };

  const spy = spyOnProperty(obj, 'method', 'get');

  obj.method();

  expect(isOriginalCalled).toBe(true);
  expect(spy).toHaveBeenCalled();
});
