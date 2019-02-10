/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const pi = require('./pi');

module.exports.loadTest = function() {
  return pi();
};

module.exports.empty = function() {
  // Do nothing.
};
