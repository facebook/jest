/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const jestMock = require('jest-mock');

module.exports = function mock(classType) {
  const mockType = jestMock.generateFromMetadata(
    jestMock.getMetadata(classType),
  );
  return new mockType();
};
