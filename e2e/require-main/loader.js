/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import path from 'path';

module.exports = function load(moduleId) {
  return require(path.join(path.dirname(require.main.filename), moduleId));
};
