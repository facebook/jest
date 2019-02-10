/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

test('throws error', () => {
  // To have the function be named the same in jasmine and circus
  // eslint-disable-next-line prefer-arrow-callback
  new Promise(resolve => setTimeout(resolve, 500)).then(function log() {
    console.log('hello!');
  });
});
