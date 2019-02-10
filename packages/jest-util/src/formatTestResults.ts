/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {TestResult} from '@jest/types';

const formatResult = (
  testResult: TestResult.TestResult,
  codeCoverageFormatter: TestResult.CodeCoverageFormatter,
  reporter: TestResult.CodeCoverageReporter,
): TestResult.FormattedTestResult => {
  const now = Date.now();
  const output: TestResult.FormattedTestResult = {
    assertionResults: [],
    coverage: {},
    endTime: now,
    message: '',
    name: testResult.testFilePath,
    startTime: now,
    status: 'failed',
    summary: '',
  };

  if (testResult.testExecError) {
    output.message = testResult.testExecError.message;
    output.coverage = {};
  } else {
    const allTestsPassed = testResult.numFailingTests === 0;
    output.status = allTestsPassed ? 'passed' : 'failed';
    output.startTime = testResult.perfStats.start;
    output.endTime = testResult.perfStats.end;
    output.coverage = codeCoverageFormatter(testResult.coverage, reporter);
  }

  output.assertionResults = testResult.testResults.map(formatTestAssertion);

  if (testResult.failureMessage) {
    output.message = testResult.failureMessage;
  }

  return output;
};

function formatTestAssertion(
  assertion: TestResult.AssertionResult,
): TestResult.FormattedAssertionResult {
  const result: TestResult.FormattedAssertionResult = {
    ancestorTitles: assertion.ancestorTitles,
    failureMessages: null,
    fullName: assertion.fullName,
    location: assertion.location,
    status: assertion.status,
    title: assertion.title,
  };
  if (assertion.failureMessages) {
    result.failureMessages = assertion.failureMessages;
  }
  return result;
}

export default function formatTestResults(
  results: TestResult.AggregatedResult,
  codeCoverageFormatter?: TestResult.CodeCoverageFormatter | null,
  reporter?: TestResult.CodeCoverageReporter,
): TestResult.FormattedTestResults {
  const formatter = codeCoverageFormatter || (coverage => coverage);

  const testResults = results.testResults.map(testResult =>
    formatResult(testResult, formatter, reporter),
  );

  return {...results, testResults};
}
