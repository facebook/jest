/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {AggregatedResult, TestResult} from '@jest/test-result';
import {preRunMessage} from 'jest-util';
import {Config} from '@jest/types';
import {ReporterOnStartOptions, Context, Test, Reporter} from './types';

const {remove: preRunMessageRemove} = preRunMessage;

export default class BaseReporter implements Reporter {
  private _error?: Error;
  private _stream: NodeJS.WriteStream;

  constructor(globalConfig?: Config.GlobalConfig) {
    if (globalConfig && globalConfig.useStderr) {
      this._stream = process.stderr;
    } else {
      this._stream = process.stdout;
    }
  }

  log(message: string) {
    this._stream.write(message + '\n');
  }

  onRunStart(_results: AggregatedResult, _options: ReporterOnStartOptions) {
    preRunMessageRemove(this._stream);
  }

  onTestResult(
    _test: Test,
    _testResult: TestResult,
    _results: AggregatedResult,
  ) {}

  onTestStart(_test: Test) {}

  onRunComplete(
    _contexts: Set<Context>,
    _aggregatedResults: AggregatedResult,
  ): Promise<void> | void {}

  protected _setError(error: Error) {
    this._error = error;
  }

  // Return an error that occurred during reporting. This error will
  // define whether the test run was successful or failed.
  getLastError() {
    return this._error;
  }
}
