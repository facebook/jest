/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {
  AggregatedResult,
  AssertionResult,
  CodeCoverageFormatter,
  CodeCoverageReporter,
  FormattedAssertionResult,
  FormattedTestResult,
  FormattedTestResults,
  TestResult,
} from './types';

const formatTestResult = (
  testResult: TestResult,
  codeCoverageFormatter?: CodeCoverageFormatter,
  reporter?: CodeCoverageReporter,
): FormattedTestResult => {
  const assertionResults = testResult.testResults.map(formatTestAssertion);
  if (testResult.testExecError) {
    const now = Date.now();
    return {
      assertionResults,
      coverage: {},
      endTime: now,
      message: testResult.failureMessage
        ? testResult.failureMessage
        : testResult.testExecError.message,
      name: testResult.testFilePath,
      startTime: now,
      status: 'failed',
      summary: '',
    };
  } else {
    const allTestsPassed = testResult.numFailingTests === 0;
    return {
      assertionResults,
      coverage: codeCoverageFormatter
        ? codeCoverageFormatter(testResult.coverage, reporter)
        : testResult.coverage,
      endTime: testResult.perfStats.end,
      message: testResult.failureMessage || '',
      name: testResult.testFilePath,
      startTime: testResult.perfStats.start,
      status: allTestsPassed ? 'passed' : 'failed',
      summary: '',
    };
  }
};

function formatTestAssertion(
  assertion: AssertionResult,
): FormattedAssertionResult {
  const result: FormattedAssertionResult = {
    ancestorTitles: assertion.ancestorTitles,
    duration: assertion.duration,
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
  results: AggregatedResult,
  codeCoverageFormatter?: CodeCoverageFormatter,
  reporter?: CodeCoverageReporter,
): FormattedTestResults {
  const testResults = results.testResults.map(testResult =>
    formatTestResult(testResult, codeCoverageFormatter, reporter),
  );

  return {...results, testResults};
}
