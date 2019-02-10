/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let moduleStateValue = 'default';

function setModuleStateValue(value) {
  moduleStateValue = value;
}

function getModuleStateValue() {
  return moduleStateValue;
}

exports.getModuleStateValue = getModuleStateValue;
exports.isRealModule = true;
exports.setModuleStateValue = setModuleStateValue;
