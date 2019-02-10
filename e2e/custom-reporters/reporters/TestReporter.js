/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

/**
 * TestReporter
 * Reporter for testing the outputs, without any extra
 * hassle. Uses a JSON like syntax for testing the reporters
 * instead of outputting the text to stdout and using match functions
 * to get the output.
 */
class TestReporter {
  constructor(globalConfig, options) {
    this._options = options;

    /**
     * statsCollected property
     * contains most of the statistics
     * related to the object to be called,
     * This here helps us in avoiding the string match
     * statements nothing else
     */
    this._statsCollected = {
      onRunComplete: {},
      onRunStart: {},
      onTestResult: {times: 0},
      onTestStart: {},
      options,
    };
  }

  /**
   * clearLine
   * clears the line for easier JSON parsing
   */
  clearLine() {
    if (process.stdout.isTTY) {
      process.stderr.write('\x1b[999D\x1b[K');
    }
  }

  onTestStart(path) {
    const onTestStart = this._statsCollected.onTestStart;

    onTestStart.called = true;
    onTestStart.path = typeof path === 'string';
  }

  onTestResult(test, testResult, results) {
    const onTestResult = this._statsCollected.onTestResult;

    onTestResult.called = true;
    onTestResult.times++;
  }

  onRunStart(results, options) {
    this.clearLine();
    const onRunStart = this._statsCollected.onRunStart;

    onRunStart.called = true;
    onRunStart.options = typeof options;
  }

  onRunComplete(contexts, results) {
    const onRunComplete = this._statsCollected.onRunComplete;

    onRunComplete.called = true;

    onRunComplete.numPassedTests = results.numPassedTests;
    onRunComplete.numFailedTests = results.numFailedTests;
    onRunComplete.numTotalTests = results.numTotalTests;

    if (this._statsCollected.options.maxWorkers) {
      // Since it's a different number on different machines.
      this._statsCollected.options.maxWorkers = '<<REPLACED>>';
    }
    // The Final Call
    process.stdout.write(JSON.stringify(this._statsCollected, null, 4));
  }
}

module.exports = TestReporter;
