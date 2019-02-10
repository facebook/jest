/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let OnlyRequiredFromMock;
let moduleStateValue = 'default';

try {
  OnlyRequiredFromMock = jest.requireActual('OnlyRequiredFromMock');
} catch (e) {
  // If the module cannot be loaded, use a dummy value. There is one test
  // that specifically tests for the correct value which ensures this feature
  // works. If the feature is broken, it doesn't cause additional log-spew in
  // surrounding tests.
  OnlyRequiredFromMock = {value: 'module OnlyRequiredFromMock not found'};
}

function setModuleStateValue(value) {
  moduleStateValue = value;
}

function getModuleStateValue() {
  return moduleStateValue;
}

exports.onlyRequiredFromMockModuleValue = OnlyRequiredFromMock.value;
exports.getModuleStateValue = getModuleStateValue;
exports.isManualMockModule = true;
exports.setModuleStateValue = setModuleStateValue;
