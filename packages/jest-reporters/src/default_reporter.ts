/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config} from '@jest/types';
import {
  AggregatedResult,
  TestCase,
  TestCaseResult,
  TestResult,
} from '@jest/test-result';
import {clearLine, isInteractive} from 'jest-util';
import {getConsoleOutput} from '@jest/console';
import chalk from 'chalk';
import {ReporterOnStartOptions, Test} from './types';
import BaseReporter from './base_reporter';
import Status from './Status';
import getResultHeader from './get_result_header';
import getSnapshotStatus from './get_snapshot_status';

type write = (chunk: string, enc?: any, cb?: () => void) => boolean;
type FlushBufferedOutput = () => void;

const TITLE_BULLET = chalk.bold('\u25cf ');

export default class DefaultReporter extends BaseReporter {
  private _clear: string; // ANSI clear sequence for the last printed status
  private _err: write;
  protected _globalConfig: Config.GlobalConfig;
  private _out: write;
  private _status: Status;
  private _bufferedOutput: Set<FlushBufferedOutput>;

  constructor(globalConfig: Config.GlobalConfig) {
    super();
    this._globalConfig = globalConfig;
    this._clear = '';
    this._out = process.stdout.write.bind(process.stdout);
    this._err = process.stderr.write.bind(process.stderr);
    this._status = new Status();
    this._bufferedOutput = new Set();
    this._wrapStdio(process.stdout);
    this._wrapStdio(process.stderr);
    this._status.onChange(() => {
      this._clearStatus();
      this._printStatus();
    });
  }

  private _wrapStdio(stream: NodeJS.WritableStream | NodeJS.WriteStream) {
    const originalWrite = stream.write;

    let buffer: Array<string> = [];
    let timeout: NodeJS.Timeout | null = null;

    const flushBufferedOutput = () => {
      const string = buffer.join('');
      buffer = [];

      // This is to avoid conflicts between random output and status text
      this._clearStatus();
      if (string) {
        originalWrite.call(stream, string);
      }
      this._printStatus();

      this._bufferedOutput.delete(flushBufferedOutput);
    };

    this._bufferedOutput.add(flushBufferedOutput);

    const debouncedFlush = () => {
      // If the process blows up no errors would be printed.
      // There should be a smart way to buffer stderr, but for now
      // we just won't buffer it.
      if (stream === process.stderr) {
        flushBufferedOutput();
      } else {
        if (!timeout) {
          timeout = setTimeout(() => {
            flushBufferedOutput();
            timeout = null;
          }, 100);
        }
      }
    };

    stream.write = (chunk: string) => {
      buffer.push(chunk);
      debouncedFlush();
      return true;
    };
  }

  // Don't wait for the debounced call and flush all output immediately.
  forceFlushBufferedOutput() {
    for (const flushBufferedOutput of this._bufferedOutput) {
      flushBufferedOutput();
    }
  }

  private _clearStatus() {
    if (isInteractive) {
      if (this._globalConfig.useStderr) {
        this._err(this._clear);
      } else {
        this._out(this._clear);
      }
    }
  }

  private _printStatus() {
    const {content, clear} = this._status.get();
    this._clear = clear;
    if (isInteractive) {
      if (this._globalConfig.useStderr) {
        this._err(content);
      } else {
        this._out(content);
      }
    }
  }

  onRunStart(
    aggregatedResults: AggregatedResult,
    options: ReporterOnStartOptions,
  ) {
    this._status.runStarted(aggregatedResults, options);
  }

  onTestStart(test: Test) {
    this._status.testStarted(test.path, test.context.config);
  }

  onTestCaseResult(
    test: Test,
    _testCase: TestCase,
    testCaseResult: TestCaseResult,
  ) {
    this._status.addTestCaseResult(test, testCaseResult);
  }

  onRunComplete() {
    this.forceFlushBufferedOutput();
    this._status.runFinished();
    process.stdout.write = this._out;
    process.stderr.write = this._err;
    clearLine(process.stderr);
  }

  onTestResult(
    test: Test,
    testResult: TestResult,
    aggregatedResults: AggregatedResult,
  ) {
    this.testFinished(test.context.config, testResult, aggregatedResults);
    if (!testResult.skipped) {
      this.printTestFileHeader(
        testResult.testFilePath,
        test.context.config,
        testResult,
      );
      this.printTestFileFailureMessage(
        testResult.testFilePath,
        test.context.config,
        testResult,
      );
    }
    this.forceFlushBufferedOutput();
  }

  testFinished(
    config: Config.ProjectConfig,
    testResult: TestResult,
    aggregatedResults: AggregatedResult,
  ) {
    this._status.testFinished(config, testResult, aggregatedResults);
  }

  printTestFileHeader(
    _testPath: Config.Path,
    config: Config.ProjectConfig,
    result: TestResult,
  ) {
    this.log(getResultHeader(result, this._globalConfig, config));
    if (result.console) {
      this.log(
        '  ' +
          TITLE_BULLET +
          'Console\n\n' +
          getConsoleOutput(
            config.cwd,
            !!this._globalConfig.verbose,
            result.console,
          ),
      );
    }
  }

  printTestFileFailureMessage(
    _testPath: Config.Path,
    _config: Config.ProjectConfig,
    result: TestResult,
  ) {
    if (result.failureMessage) {
      this.log(result.failureMessage);
    }
    const didUpdate = this._globalConfig.updateSnapshot === 'all';
    const snapshotStatuses = getSnapshotStatus(result.snapshot, didUpdate);
    snapshotStatuses.forEach(this.log);
  }
}
