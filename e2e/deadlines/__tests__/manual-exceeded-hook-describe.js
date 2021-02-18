/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));

describe('describe', () => {
  beforeAll(async () => {
    await expect.withinDeadline(sleep(200));
  }, 50);

  it('does nothing', () => {});
});
