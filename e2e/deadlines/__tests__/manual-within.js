/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));

describe('describe', () => {
  it('it', async () => {
    await expect.withinDeadline(sleep(50));
  }, 200);
});
