/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fs = jest.genMockFromModule('fs');

const mockFiles = new Map();
function __setMockFiles(newMockFiles) {
  mockFiles.clear();
  Object.keys(newMockFiles).forEach(fileName => {
    mockFiles.set(fileName, newMockFiles[fileName]);
  });
}

fs.__setMockFiles = __setMockFiles;
fs.readFileSync = jest.fn(file => mockFiles.get(file));

module.exports = fs;
