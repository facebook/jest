/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig, ProjectConfig} from 'types/Config';
import type {TestResult} from 'types/TestResult';

import chalk from 'chalk';
import {formatTestPath, printDisplayName} from './utils';

const LONG_TEST_COLOR = chalk.reset.bold.bgRed;
// Explicitly reset for these messages since they can get written out in the
// middle of error logging
const FAIL_TEXT = 'FAIL';
const PASS_TEXT = 'PASS';

const FAIL = chalk.supportsColor
  ? chalk.reset.inverse.bold.red(` ${FAIL_TEXT} `)
  : FAIL_TEXT;

const PASS = chalk.supportsColor
  ? chalk.reset.inverse.bold.green(` ${PASS_TEXT} `)
  : PASS_TEXT;

export default (
  result: TestResult,
  globalConfig: GlobalConfig,
  projectConfig?: ProjectConfig,
) => {
  const testPath = result.testFilePath;
  const status =
    result.numFailingTests > 0 || result.testExecError ? FAIL : PASS;

  const runTime = result.perfStats
    ? (result.perfStats.end - result.perfStats.start) / 1000
    : null;

  const testDetail = [];
  if (runTime !== null && runTime > 5) {
    testDetail.push(LONG_TEST_COLOR(runTime + 's'));
  }

  if (result.memoryUsage) {
    const toMB = bytes => Math.floor(bytes / 1024 / 1024);
    testDetail.push(`${toMB(result.memoryUsage)} MB heap size`);
  }

  const projectDisplayName =
    projectConfig && projectConfig.displayName
      ? printDisplayName(projectConfig) + ' '
      : '';

  return (
    `${status} ${projectDisplayName}${formatTestPath(
      projectConfig ? projectConfig : globalConfig,
      testPath,
    )}` + (testDetail.length ? ` (${testDetail.join(', ')})` : '')
  );
};
