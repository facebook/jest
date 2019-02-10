/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fs = require('fs');

/**
 * RetryReporter
 * Reporter for testing output of onRunComplete
 */
class RetryReporter {
  constructor(globalConfig, options) {
    this._options = options;
  }

  onRunComplete(contexts, results) {
    if (this._options.output) {
      fs.writeFileSync(this._options.output, JSON.stringify(results, null, 2), {
        encoding: 'utf8',
      });
    }
  }
}

module.exports = RetryReporter;
