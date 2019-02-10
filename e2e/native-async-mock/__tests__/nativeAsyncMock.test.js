// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

jest.mock('../Native');

const native = require('../Native');

test('mock works with native async', () => {
  expect(native.asyncMethod).toBeDefined();
});
