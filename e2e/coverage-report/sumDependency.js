/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

require('path');

const uncoveredFunction = () => (true ? 1 + '5' : '999');

module.exports = {
  uncoveredFunction,
};
