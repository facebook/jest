/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

describe('promise xit', () => {
  xit('fails but will be skipped', () => {
    expect(true).toBe(false);
  });

  it('will run', () => Promise.resolve());
});
