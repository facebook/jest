/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

// For some reason thinks it's a strict violation.
if (exports !== this) {
  throw new Error('Invalid module context');
}

let moduleStateValue = 'default';

function setModuleStateValue(value) {
  moduleStateValue = value;
}

function getModuleStateValue() {
  return moduleStateValue;
}

const lazyRequire = () => {
  // Make sure ModuleWithSideEffects is part of the module map for
  // RegularModule.
  require('ModuleWithSideEffects');
};

exports.filename = module.filename;
exports.getModuleStateValue = getModuleStateValue;
exports.isRealModule = true;
exports.jest = jest;
exports.lazyRequire = lazyRequire;
exports.object = {};
exports.parent = module.parent;
exports.paths = module.paths;
exports.setModuleStateValue = setModuleStateValue;
exports.module = module;
exports.loaded = module.loaded;
exports.isLoaded = () => module.loaded;
