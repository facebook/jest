/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fs = jest.genMockFromModule('fs');

let mkdirWasCalled = false;

function mkdirSync() {
  mkdirWasCalled = true;
  return;
}

fs.mkdirSync = mkdirSync;
fs.__wasMkdirCalled = function() {
  return mkdirWasCalled;
};

module.exports = fs;
