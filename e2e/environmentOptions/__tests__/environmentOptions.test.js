/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';
/*global window */

test('found userAgent Agent/007', () => {
  expect(window.navigator.userAgent).toBe('Agent/007');
});
