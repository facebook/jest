/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk = require('chalk');
import {getConsoleOutput} from '@jest/console';
import type {
  AggregatedResult,
  TestCaseResult,
  TestResult,
} from '@jest/test-result';
import type {Config} from '@jest/types';
import {clearLine, isInteractive} from 'jest-util';
import BaseReporter from './BaseReporter';
import Status from './Status';
import getResultHeader from './getResultHeader';
import getSnapshotStatus from './getSnapshotStatus';
import type {ReporterOnStartOptions, Test} from './types';

type write = NodeJS.WriteStream['write'];
type FlushBufferedOutput = () => void;

const TITLE_BULLET = chalk.bold('\u25cf ');

export default class DefaultReporter extends BaseReporter {
  private _clear: string; // ANSI clear sequence for the last printed status
  private _err: write;
  protected _globalConfig: Config.GlobalConfig;
  private _out: write;
  private _status: Status;
  private _bufferedOutput: Set<FlushBufferedOutput>;

  static readonly filename = __filename;

  constructor(globalConfig: Config.GlobalConfig) {
    super();
    this._globalConfig = globalConfig;
    this._clear = '';
    this._out = process.stdout.write.bind(process.stdout);
    this._err = process.stderr.write.bind(process.stderr);
    this._status = new Status();
    this._bufferedOutput = new Set();
    this.__wrapStdio(process.stdout);
    this.__wrapStdio(process.stderr);
    this._status.onChange(() => {
      this.__clearStatus();
      this.__printStatus();
    });
  }

  protected __wrapStdio(
    stream: NodeJS.WritableStream | NodeJS.WriteStream,
  ): void {
    const write = stream.write.bind(stream);

    let buffer: Array<string> = [];
    let timeout: NodeJS.Timeout | null = null;

    const flushBufferedOutput = () => {
      const string = buffer.join('');
      buffer = [];

      // This is to avoid conflicts between random output and status text
      this.__clearStatus();
      if (string) {
        write(string);
      }
      this.__printStatus();

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
  forceFlushBufferedOutput(): void {
    for (const flushBufferedOutput of this._bufferedOutput) {
      flushBufferedOutput();
    }
  }

  protected __clearStatus(): void {
    if (isInteractive) {
      if (this._globalConfig.useStderr) {
        this._err(this._clear);
      } else {
        this._out(this._clear);
      }
    }
  }

  protected __printStatus(): void {
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
  ): void {
    this._status.runStarted(aggregatedResults, options);
  }

  onTestStart(test: Test): void {
    this._status.testStarted(test.path, test.context.config);
  }

  onTestCaseResult(test: Test, testCaseResult: TestCaseResult): void {
    this._status.addTestCaseResult(test, testCaseResult);
  }

  onRunComplete(): void {
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
  ): void {
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
  ): void {
    this._status.testFinished(config, testResult, aggregatedResults);
  }

  printTestFileHeader(
    _testPath: Config.Path,
    config: Config.ProjectConfig,
    result: TestResult,
  ): void {
    this.log(getResultHeader(result, this._globalConfig, config));
    if (result.console) {
      this.log(
        '  ' +
          TITLE_BULLET +
          'Console\n\n' +
          getConsoleOutput(result.console, config, this._globalConfig),
      );
    }
  }

  printTestFileFailureMessage(
    _testPath: Config.Path,
    _config: Config.ProjectConfig,
    result: TestResult,
  ): void {
    if (result.failureMessage) {
      this.log(result.failureMessage);
    }
    const didUpdate = this._globalConfig.updateSnapshot === 'all';
    const snapshotStatuses = getSnapshotStatus(result.snapshot, didUpdate);
    snapshotStatuses.forEach(this.log);
  }
}
