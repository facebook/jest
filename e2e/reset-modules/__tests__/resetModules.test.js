/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

global.testObject = new Proxy(
  {},
  {
    get: function getter(target, key) {
      return key;
    },
  }
);
test('jest.resetModules should not error when _isMockFunction is defined but not boolean', () => {
  jest.resetModules();
});
