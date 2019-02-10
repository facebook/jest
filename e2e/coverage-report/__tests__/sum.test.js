/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

jest.mock('../sumDependency.js'); // call mock explicitly

const {sum} = require('../sum');

if (!global.setup) {
  throw new Error('setup.js was not called.');
}

describe('sum', () => {
  it('adds numbers', () => {
    expect(sum(1, 2)).toEqual(3);
  });
});
