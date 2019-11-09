/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config} from '@jest/types';
import {AggregatedResult, TestCaseResult, TestResult} from '@jest/test-result';
import chalk from 'chalk';
import stringLength = require('string-length');
import {ReporterOnStartOptions, Test} from './types';
import {
  getSummary,
  printDisplayName,
  trimAndFormatPath,
  wrapAnsiString,
} from './utils';

const RUNNING_TEXT = ' RUNS ';
const RUNNING = chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';

/**
 * This class is a perf optimization for sorting the list of currently
 * running tests. It tries to keep tests in the same positions without
 * shifting the whole list.
 */
class CurrentTestList {
  private _array: Array<{
    testPath: Config.Path;
    config: Config.ProjectConfig;
  } | null>;

  constructor() {
    this._array = [];
  }

  add(testPath: Config.Path, config: Config.ProjectConfig) {
    const index = this._array.indexOf(null);
    const record = {config, testPath};
    if (index !== -1) {
      this._array[index] = record;
    } else {
      this._array.push(record);
    }
  }

  delete(testPath: Config.Path) {
    const record = this._array.find(
      record => record !== null && record.testPath === testPath,
    );
    this._array[this._array.indexOf(record || null)] = null;
  }

  get() {
    return this._array;
  }
}
/**
 * A class that generates the CLI status of currently running tests
 * and also provides an ANSI escape sequence to remove status lines
 * from the terminal.
 */
export default class Status {
  private _cache: {content: string; clear: string} | null;
  private _callback?: () => void;
  private _currentTests: CurrentTestList;
  private _currentTestCases: Array<{
    test: Test;
    testCaseResult: TestCaseResult;
  }>;
  private _done: boolean;
  private _emitScheduled: boolean;
  private _estimatedTime: number;
  private _interval?: NodeJS.Timeout;
  private _aggregatedResults?: AggregatedResult;
  private _showStatus: boolean;

  constructor() {
    this._cache = null;
    this._currentTests = new CurrentTestList();
    this._currentTestCases = [];
    this._done = false;
    this._emitScheduled = false;
    this._estimatedTime = 0;
    this._showStatus = false;
  }

  onChange(callback: () => void) {
    this._callback = callback;
  }

  runStarted(
    aggregatedResults: AggregatedResult,
    options: ReporterOnStartOptions,
  ) {
    this._estimatedTime = (options && options.estimatedTime) || 0;
    this._showStatus = options && options.showStatus;
    this._interval = setInterval(() => this._tick(), 1000);
    this._aggregatedResults = aggregatedResults;
    this._debouncedEmit();
  }

  runFinished() {
    this._done = true;
    if (this._interval) clearInterval(this._interval);
    this._emit();
  }

  addTestCaseResult(test: Test, testCaseResult: TestCaseResult) {
    this._currentTestCases.push({test, testCaseResult});
    if (!this._showStatus) {
      this._emit();
    } else {
      this._debouncedEmit();
    }
  }

  testStarted(testPath: Config.Path, config: Config.ProjectConfig) {
    this._currentTests.add(testPath, config);
    if (!this._showStatus) {
      this._emit();
    } else {
      this._debouncedEmit();
    }
  }

  testFinished(
    _config: Config.ProjectConfig,
    testResult: TestResult,
    aggregatedResults: AggregatedResult,
  ) {
    const {testFilePath} = testResult;
    this._aggregatedResults = aggregatedResults;
    this._currentTests.delete(testFilePath);
    this._currentTestCases = this._currentTestCases.filter(({test}) =>
      _config === test.context.config ? test.path !== testFilePath : true,
    );
    this._debouncedEmit();
  }

  get() {
    if (this._cache) {
      return this._cache;
    }

    if (this._done) {
      return {clear: '', content: ''};
    }

    const width: number = process.stdout.columns!;
    let content = '\n';
    this._currentTests.get().forEach(record => {
      if (record) {
        const {config, testPath} = record;

        const projectDisplayName = config.displayName
          ? printDisplayName(config) + ' '
          : '';
        const prefix = RUNNING + projectDisplayName;

        content +=
          wrapAnsiString(
            prefix +
              trimAndFormatPath(stringLength(prefix), config, testPath, width),
            width,
          ) + '\n';
      }
    });

    if (this._showStatus && this._aggregatedResults) {
      content +=
        '\n' +
        getSummary(this._aggregatedResults, {
          currentTestCases: this._currentTestCases,
          estimatedTime: this._estimatedTime,
          roundTime: true,
          width,
        });
    }

    let height = 0;

    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        height++;
      }
    }

    const clear = '\r\x1B[K\r\x1B[1A'.repeat(height);
    return (this._cache = {clear, content});
  }

  private _emit() {
    this._cache = null;
    if (this._callback) this._callback();
  }

  private _debouncedEmit() {
    if (!this._emitScheduled) {
      // Perf optimization to avoid two separate renders When
      // one test finishes and another test starts executing.
      this._emitScheduled = true;
      setTimeout(() => {
        this._emit();
        this._emitScheduled = false;
      }, 100);
    }
  }

  private _tick() {
    this._debouncedEmit();
  }
}
