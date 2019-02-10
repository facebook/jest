/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AggregatedResult, TestResult} from 'types/TestResult';
import type {Context} from 'types/Context';
import type {Test} from 'types/TestRunner';
import type {ReporterOnStartOptions} from 'types/Reporters';

import {remove as preRunMessageRemove} from '../preRunMessage';

export default class BaseReporter {
  _error: ?Error;

  log(message: string) {
    process.stderr.write(message + '\n');
  }

  onRunStart(results: AggregatedResult, options: ReporterOnStartOptions) {
    preRunMessageRemove(process.stderr);
  }

  onTestResult(test: Test, testResult: TestResult, results: AggregatedResult) {}

  onTestStart(test: Test) {}

  onRunComplete(
    contexts: Set<Context>,
    aggregatedResults: AggregatedResult,
  ): ?Promise<void> {}

  _setError(error: Error) {
    this._error = error;
  }

  // Return an error that occurred during reporting. This error will
  // define whether the test run was successful or failed.
  getLastError(): ?Error {
    return this._error;
  }
}
