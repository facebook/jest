/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config, TestResult} from '@jest/types';

import chalk from 'chalk';
import {specialChars} from 'jest-util';
import {Test} from './types';
import DefaultReporter from './default_reporter';

const {ICONS} = specialChars;

export default class VerboseReporter extends DefaultReporter {
  protected _globalConfig: Config.GlobalConfig;

  constructor(globalConfig: Config.GlobalConfig) {
    super(globalConfig);
    this._globalConfig = globalConfig;
  }

  static filterTestResults(
    testResults: Array<TestResult.AssertionResult>,
  ): Array<TestResult.AssertionResult> {
    return testResults.filter(({status}) => status !== 'pending');
  }

  static groupTestsBySuites(testResults: Array<TestResult.AssertionResult>) {
    const root: TestResult.Suite = {suites: [], tests: [], title: ''};
    testResults.forEach(testResult => {
      let targetSuite = root;

      // Find the target suite for this test,
      // creating nested suites as necessary.
      for (const title of testResult.ancestorTitles) {
        let matchingSuite = targetSuite.suites.find(s => s.title === title);
        if (!matchingSuite) {
          matchingSuite = {suites: [], tests: [], title};
          targetSuite.suites.push(matchingSuite);
        }
        targetSuite = matchingSuite;
      }

      targetSuite.tests.push(testResult);
    });
    return root;
  }

  onTestResult(
    test: Test,
    result: TestResult.TestResult,
    aggregatedResults: TestResult.AggregatedResult,
  ) {
    super.testFinished(test.context.config, result, aggregatedResults);
    if (!result.skipped) {
      this.printTestFileHeader(
        result.testFilePath,
        test.context.config,
        result,
      );
      if (!result.testExecError && !result.skipped) {
        this._logTestResults(result.testResults);
      }
      this.printTestFileFailureMessage(
        result.testFilePath,
        test.context.config,
        result,
      );
    }
    super.forceFlushBufferedOutput();
  }

  private _logTestResults(testResults: Array<TestResult.AssertionResult>) {
    this._logSuite(VerboseReporter.groupTestsBySuites(testResults), 0);
    this._logLine();
  }

  private _logSuite(suite: TestResult.Suite, indentLevel: number) {
    if (suite.title) {
      this._logLine(suite.title, indentLevel);
    }

    this._logTests(suite.tests, indentLevel + 1);

    suite.suites.forEach(suite => this._logSuite(suite, indentLevel + 1));
  }

  private _getIcon(status: string) {
    if (status === 'failed') {
      return chalk.red(ICONS.failed);
    } else if (status === 'pending') {
      return chalk.yellow(ICONS.pending);
    } else if (status === 'todo') {
      return chalk.magenta(ICONS.todo);
    } else {
      return chalk.green(ICONS.success);
    }
  }

  private _logTest(test: TestResult.AssertionResult, indentLevel: number) {
    const status = this._getIcon(test.status);
    const time = test.duration ? ` (${test.duration.toFixed(0)}ms)` : '';
    this._logLine(status + ' ' + chalk.dim(test.title + time), indentLevel);
  }

  private _logTests(
    tests: Array<TestResult.AssertionResult>,
    indentLevel: number,
  ) {
    if (this._globalConfig.expand) {
      tests.forEach(test => this._logTest(test, indentLevel));
    } else {
      const summedTests = tests.reduce<{
        pending: Array<TestResult.AssertionResult>;
        todo: Array<TestResult.AssertionResult>;
      }>(
        (result, test) => {
          if (test.status === 'pending') {
            result.pending.push(test);
          } else if (test.status === 'todo') {
            result.todo.push(test);
          } else {
            this._logTest(test, indentLevel);
          }

          return result;
        },
        {pending: [], todo: []},
      );

      if (summedTests.pending.length > 0) {
        summedTests.pending.forEach(this._logTodoOrPendingTest(indentLevel));
      }

      if (summedTests.todo.length > 0) {
        summedTests.todo.forEach(this._logTodoOrPendingTest(indentLevel));
      }
    }
  }

  private _logTodoOrPendingTest(indentLevel: number) {
    return (test: TestResult.AssertionResult) => {
      const printedTestStatus = test.status === "pending" ? "skipped": test.status;
      const icon = this._getIcon(test.status);
      const text = chalk.dim(`${printedTestStatus} "${test.title}"`);
      this._logLine(`${icon} ${text}`, indentLevel);
    };
  }

  private _logLine(str?: string, indentLevel?: number) {
    const indentation = '  '.repeat(indentLevel || 0);
    this.log(indentation + (str || ''));
  }
}
