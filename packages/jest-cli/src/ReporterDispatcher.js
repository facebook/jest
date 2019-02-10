/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Context} from 'types/Context';
import type {Reporter, Test} from 'types/TestRunner';
import type {TestResult, AggregatedResult} from 'types/TestResult';
import type {ReporterOnStartOptions} from 'types/Reporters';

export type RunOptions = {|
  estimatedTime: number,
  showStatus: boolean,
|};

export default class ReporterDispatcher {
  _disabled: boolean;
  _reporters: Array<Reporter>;

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

  async onTestResult(
    test: Test,
    testResult: TestResult,
    results: AggregatedResult,
  ) {
    for (const reporter of this._reporters) {
      reporter.onTestResult &&
        (await reporter.onTestResult(test, testResult, results));
    }
  }

  async onTestStart(test: Test) {
    for (const reporter of this._reporters) {
      reporter.onTestStart && (await reporter.onTestStart(test));
    }
  }

  async onRunStart(results: AggregatedResult, options: ReporterOnStartOptions) {
    for (const reporter of this._reporters) {
      reporter.onRunStart && (await reporter.onRunStart(results, options));
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
    return this._reporters.reduce((list, reporter) => {
      const error = reporter.getLastError && reporter.getLastError();
      return error ? list.concat(error) : list;
    }, []);
  }

  hasErrors(): boolean {
    return this.getErrors().length !== 0;
  }
}
