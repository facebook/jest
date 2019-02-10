/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment jsdom
 */

'use strict';

it('async test fails', done => {
  setTimeout(() => {
    expect(false).toBeTruthy();
    done();
  }, 1 * 1000);
});
