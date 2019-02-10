/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

test('jasmine.objectContaining', () => {
  expect({input: 'trash', output: 'trash'}).toEqual(
    jasmine.objectContaining({output: 'trash'})
  );
});
