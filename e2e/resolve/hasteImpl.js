/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 */

const path = require('path');

module.exports = {
  getHasteName(filePath) {
    const name = path.parse(filePath).name;
    const isMock = filePath.indexOf('__mocks__') !== -1;

    // Mocks are automatically parsed by Jest already.
    return name.startsWith('Test') && !isMock ? name : null;
  },
};
