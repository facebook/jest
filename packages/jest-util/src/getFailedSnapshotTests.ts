/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config, TestResult} from '@jest/types';

function getFailedSnapshotTests(testResults: TestResult.AggregatedResult) {
  const failedTestPaths: Array<Config.Path> = [];
  if (testResults.numFailedTests === 0 || !testResults.testResults) {
    return failedTestPaths;
  }

  testResults.testResults.forEach(testResult => {
    if (testResult.snapshot && testResult.snapshot.unmatched) {
      failedTestPaths.push(testResult.testFilePath);
    }
  });

  return failedTestPaths;
}

export default getFailedSnapshotTests;
