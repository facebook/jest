/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

/**
 * IncompleteReporter
 * Reporter to test for the flexibility of the interface we implemented.
 * The reporters shouldn't be required to implement all the methods
 *
 * This only implements one method onRunComplete which should be called
 */
class IncompleteReporter {
  onRunComplete(contexts, results) {
    console.log('onRunComplete is called');
    console.log('Passed Tests: ' + results.numPassedTests);
    console.log('Failed Tests: ' + results.numFailedTests);
    console.log('Total Tests: ' + results.numTotalTests);
  }
}

module.exports = IncompleteReporter;
