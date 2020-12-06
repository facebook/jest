/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs');

const beSlightlySlow = () => fs.readdirSync('.');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

beSlightlySlow();

describe('desc', () => {
  beSlightlySlow();
  beforeAll(async () => sleep(10));
  beforeAll(async () => sleep(10));
  beforeEach(async () => sleep(10));
  it('does nothing', () => {});
  it('does nothing again', () => {});
  afterEach(async () => sleep(10));
  afterAll(async () => sleep(10));
});
