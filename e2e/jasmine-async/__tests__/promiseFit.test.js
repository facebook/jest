/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable jest/no-focused-tests */

'use strict';

describe('promise fit', () => {
  it('fails but will be skipped', () => {
    expect(true).toBe(false);
  });

  fit('will run', () => Promise.resolve());

  fit('will run and fail', () => Promise.reject());
});
