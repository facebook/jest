/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

module.exports = function userResolver(path, options) {
  const defaultResolver = require('../__tests__/defaultResolver.js');
  const [clearPath, query] = path.split('?');
  return defaultResolver(clearPath, options) + (query ? '?' + query : '');
};
