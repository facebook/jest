/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  AggregatedResult,
  TestCase,
  TestCaseResult,
  TestResult,
} from '@jest/test-result';
import {Test} from 'jest-runner';
import {Context} from 'jest-runtime';
import {Reporter, ReporterOnStartOptions} from '@jest/reporters';

export default class ReporterDispatcher {
  private _reporters: Array<Reporter>;

  constructor() {
    this._reporters = [];
  }

  register(reporter: Reporter): void {
    this._reporters.push(reporter);
  }

  unregister(ReporterClass: Function) {
    this._reporters = this._reporters.filter(
      reporter => !(reporter instanceof ReporterClass),
    );
  }

  async onTestFileResult(
    test: Test,
    testResult: TestResult,
    results: AggregatedResult,
  ) {
    for (const reporter of this._reporters) {
      if (reporter.onTestFileResult) {
        await reporter.onTestFileResult(test, testResult, results);
      } else if (reporter.onTestResult) {
        await reporter.onTestResult(test, testResult, results);
      }
    }

    // Release memory if unused later.
    testResult.sourceMaps = undefined;
    testResult.coverage = undefined;
    testResult.console = undefined;
  }

  async onTestFileStart(test: Test) {
    for (const reporter of this._reporters) {
      if (reporter.onTestFileStart) {
        await reporter.onTestFileStart(test);
      } else if (reporter.onTestStart) {
        await reporter.onTestStart(test);
      }
    }
  }

  async onRunStart(results: AggregatedResult, options: ReporterOnStartOptions) {
    for (const reporter of this._reporters) {
      reporter.onRunStart && (await reporter.onRunStart(results, options));
    }
  }

  async onTestCaseResult(
    test: Test,
    testCase: TestCase,
    testCaseResult: TestCaseResult,
  ) {
    for (const reporter of this._reporters) {
      reporter.onTestCaseResult &&
        (await reporter.onTestCaseResult(test, testCase, testCaseResult));
    }
  }

  async onRunComplete(contexts: Set<Context>, results: AggregatedResult) {
    for (const reporter of this._reporters) {
      reporter.onRunComplete &&
        (await reporter.onRunComplete(contexts, results));
    }
  }

  // Return a list of last errors for every reporter
  getErrors(): Array<Error> {
    return this._reporters.reduce<Array<Error>>((list, reporter) => {
      const error = reporter.getLastError && reporter.getLastError();
      return error ? list.concat(error) : list;
    }, []);
  }

  hasErrors(): boolean {
    return this.getErrors().length !== 0;
  }
}
