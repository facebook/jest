/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig} from 'types/Config';
import type {
  AggregatedResult,
  AssertionResult,
  Suite,
  TestResult,
} from 'types/TestResult';
import type {Test} from 'types/TestRunner';

import chalk from 'chalk';
import {specialChars} from 'jest-util';
import DefaultReporter from './default_reporter';

const {ICONS} = specialChars;

export default class VerboseReporter extends DefaultReporter {
  _globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    super(globalConfig);
    this._globalConfig = globalConfig;
  }

  static filterTestResults(
    testResults: Array<AssertionResult>,
  ): Array<AssertionResult> {
    return testResults.filter(({status}) => status !== 'pending');
  }

  static groupTestsBySuites(testResults: Array<AssertionResult>) {
    const root = {suites: [], tests: [], title: ''};
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
    result: TestResult,
    aggregatedResults: AggregatedResult,
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

  _logTestResults(testResults: Array<AssertionResult>) {
    this._logSuite(VerboseReporter.groupTestsBySuites(testResults), 0);
    this._logLine();
  }

  _logSuite(suite: Suite, indentLevel: number) {
    if (suite.title) {
      this._logLine(suite.title, indentLevel);
    }

    this._logTests(suite.tests, indentLevel + 1);

    suite.suites.forEach(suite => this._logSuite(suite, indentLevel + 1));
  }

  _getIcon(status: string) {
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

  _logTest(test: AssertionResult, indentLevel: number) {
    const status = this._getIcon(test.status);
    const time = test.duration ? ` (${test.duration.toFixed(0)}ms)` : '';
    this._logLine(status + ' ' + chalk.dim(test.title + time), indentLevel);
  }

  _logTests(tests: Array<AssertionResult>, indentLevel: number) {
    if (this._globalConfig.expand) {
      tests.forEach(test => this._logTest(test, indentLevel));
    } else {
      const summedTests = tests.reduce(
        (result, test) => {
          if (test.status === 'pending') {
            result.pending += 1;
          } else if (test.status === 'todo') {
            result.todo += 1;
          } else {
            this._logTest(test, indentLevel);
          }

          return result;
        },
        {pending: 0, todo: 0},
      );

      if (summedTests.pending > 0) {
        this._logSummedTests(
          'skipped',
          this._getIcon('pending'),
          summedTests.pending,
          indentLevel,
        );
      }

      if (summedTests.todo > 0) {
        this._logSummedTests(
          'todo',
          this._getIcon('todo'),
          summedTests.todo,
          indentLevel,
        );
      }
    }
  }

  _logSummedTests(
    prefix: string,
    icon: string,
    count: number,
    indentLevel: number,
  ) {
    const text = chalk.dim(`${prefix} ${count} test${count === 1 ? '' : 's'}`);
    this._logLine(`${icon} ${text}`, indentLevel);
  }

  _logLine(str?: string, indentLevel?: number) {
    const indentation = '  '.repeat(indentLevel || 0);
    this.log(indentation + (str || ''));
  }
}
