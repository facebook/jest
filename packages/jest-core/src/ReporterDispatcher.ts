/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {
  AggregatedResult,
  TestProgress,
  TestResult,
} from '@jest/test-result';
import type {Test} from 'jest-runner';
import type {Context} from 'jest-runtime';
import type {Reporter, ReporterOnStartOptions} from '@jest/reporters';

export default class ReporterDispatcher {
  private _reporters: Array<Reporter>;

  constructor() {
    this._reporters = [];
  }

  register(reporter: Reporter): void {
    this._reporters.push(reporter);
  }

  unregister(ReporterClass: Function): void {
    this._reporters = this._reporters.filter(
      reporter => !(reporter instanceof ReporterClass),
    );
  }

  async onTestResult(
    test: Test,
    testResult: TestResult,
    results: AggregatedResult,
  ): Promise<void> {
    for (const reporter of this._reporters) {
      reporter.onTestResult &&
        (await reporter.onTestResult(test, testResult, results));
    }

    // Release memory if unused later.
    testResult.sourceMaps = undefined;
    testResult.coverage = undefined;
    testResult.console = undefined;
  }

  async onTestStart(test: Test): Promise<void> {
    for (const reporter of this._reporters) {
      reporter.onTestStart && (await reporter.onTestStart(test));
    }
  }

  async onTestProgress(test: Test, progress: TestProgress): Promise<void> {
    for (const reporter of this._reporters) {
      reporter.onTestProgress &&
        (await reporter.onTestProgress(test, progress));
    }
  }

  async onRunStart(
    results: AggregatedResult,
    options: ReporterOnStartOptions,
  ): Promise<void> {
    for (const reporter of this._reporters) {
      reporter.onRunStart && (await reporter.onRunStart(results, options));
    }
  }

  async onRunComplete(
    contexts: Set<Context>,
    results: AggregatedResult,
  ): Promise<void> {
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
