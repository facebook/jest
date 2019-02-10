/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path, ProjectConfig, GlobalConfig} from 'types/Config';
import type {AggregatedResult} from 'types/TestResult';

import path from 'path';
import chalk from 'chalk';
import slash from 'slash';

type SummaryOptions = {|
  estimatedTime?: number,
  roundTime?: boolean,
  width?: number,
|};

const PROGRESS_BAR_WIDTH = 40;

export const printDisplayName = (config: ProjectConfig) => {
  const {displayName} = config;

  if (displayName) {
    return chalk.supportsColor
      ? chalk.reset.inverse.white(` ${displayName} `)
      : displayName;
  }

  return '';
};

export const trimAndFormatPath = (
  pad: number,
  config: ProjectConfig | GlobalConfig,
  testPath: Path,
  columns: number,
): string => {
  const maxLength = columns - pad;
  const relative = relativePath(config, testPath);
  const {basename} = relative;
  let {dirname} = relative;

  // length is ok
  if ((dirname + path.sep + basename).length <= maxLength) {
    return slash(chalk.dim(dirname + path.sep) + chalk.bold(basename));
  }

  // we can fit trimmed dirname and full basename
  const basenameLength = basename.length;
  if (basenameLength + 4 < maxLength) {
    const dirnameLength = maxLength - 4 - basenameLength;
    dirname =
      '...' + dirname.slice(dirname.length - dirnameLength, dirname.length);
    return slash(chalk.dim(dirname + path.sep) + chalk.bold(basename));
  }

  if (basenameLength + 4 === maxLength) {
    return slash(chalk.dim('...' + path.sep) + chalk.bold(basename));
  }

  // can't fit dirname, but can fit trimmed basename
  return slash(
    chalk.bold(
      '...' + basename.slice(basename.length - maxLength - 4, basename.length),
    ),
  );
};

export const formatTestPath = (
  config: GlobalConfig | ProjectConfig,
  testPath: Path,
) => {
  const {dirname, basename} = relativePath(config, testPath);
  return slash(chalk.dim(dirname + path.sep) + chalk.bold(basename));
};

export const relativePath = (
  config: GlobalConfig | ProjectConfig,
  testPath: Path,
) => {
  // this function can be called with ProjectConfigs or GlobalConfigs. GlobalConfigs
  // do not have config.cwd, only config.rootDir. Try using config.cwd, fallback
  // to config.rootDir. (Also, some unit just use config.rootDir, which is ok)
  testPath = path.relative(config.cwd || config.rootDir, testPath);
  const dirname = path.dirname(testPath);
  const basename = path.basename(testPath);
  return {basename, dirname};
};

export const pluralize = (word: string, count: number) =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

export const getSummary = (
  aggregatedResults: AggregatedResult,
  options?: SummaryOptions,
) => {
  let runTime = (Date.now() - aggregatedResults.startTime) / 1000;
  if (options && options.roundTime) {
    runTime = Math.floor(runTime);
  }

  const estimatedTime = (options && options.estimatedTime) || 0;
  const snapshotResults = aggregatedResults.snapshot;
  const snapshotsAdded = snapshotResults.added;
  const snapshotsFailed = snapshotResults.unmatched;
  const snapshotsOutdated = snapshotResults.unchecked;
  const snapshotsFilesRemoved = snapshotResults.filesRemoved;
  const snapshotsDidUpdate = snapshotResults.didUpdate;
  const snapshotsPassed = snapshotResults.matched;
  const snapshotsTotal = snapshotResults.total;
  const snapshotsUpdated = snapshotResults.updated;
  const suitesFailed = aggregatedResults.numFailedTestSuites;
  const suitesPassed = aggregatedResults.numPassedTestSuites;
  const suitesPending = aggregatedResults.numPendingTestSuites;
  const suitesRun = suitesFailed + suitesPassed;
  const suitesTotal = aggregatedResults.numTotalTestSuites;
  const testsFailed = aggregatedResults.numFailedTests;
  const testsPassed = aggregatedResults.numPassedTests;
  const testsPending = aggregatedResults.numPendingTests;
  const testsTodo = aggregatedResults.numTodoTests;
  const testsTotal = aggregatedResults.numTotalTests;
  const width = (options && options.width) || 0;

  const suites =
    chalk.bold('Test Suites: ') +
    (suitesFailed ? chalk.bold.red(`${suitesFailed} failed`) + ', ' : '') +
    (suitesPending
      ? chalk.bold.yellow(`${suitesPending} skipped`) + ', '
      : '') +
    (suitesPassed ? chalk.bold.green(`${suitesPassed} passed`) + ', ' : '') +
    (suitesRun !== suitesTotal
      ? suitesRun + ' of ' + suitesTotal
      : suitesTotal) +
    ` total`;

  const tests =
    chalk.bold('Tests:       ') +
    (testsFailed ? chalk.bold.red(`${testsFailed} failed`) + ', ' : '') +
    (testsPending ? chalk.bold.yellow(`${testsPending} skipped`) + ', ' : '') +
    (testsTodo ? chalk.bold.magenta(`${testsTodo} todo`) + ', ' : '') +
    (testsPassed ? chalk.bold.green(`${testsPassed} passed`) + ', ' : '') +
    `${testsTotal} total`;

  const snapshots =
    chalk.bold('Snapshots:   ') +
    (snapshotsFailed
      ? chalk.bold.red(`${snapshotsFailed} failed`) + ', '
      : '') +
    (snapshotsOutdated && !snapshotsDidUpdate
      ? chalk.bold.yellow(`${snapshotsOutdated} obsolete`) + ', '
      : '') +
    (snapshotsOutdated && snapshotsDidUpdate
      ? chalk.bold.green(`${snapshotsOutdated} removed`) + ', '
      : '') +
    (snapshotsFilesRemoved && !snapshotsDidUpdate
      ? chalk.bold.yellow(
          pluralize('file', snapshotsFilesRemoved) + ' obsolete',
        ) + ', '
      : '') +
    (snapshotsFilesRemoved && snapshotsDidUpdate
      ? chalk.bold.green(
          pluralize('file', snapshotsFilesRemoved) + ' removed',
        ) + ', '
      : '') +
    (snapshotsUpdated
      ? chalk.bold.green(`${snapshotsUpdated} updated`) + ', '
      : '') +
    (snapshotsAdded
      ? chalk.bold.green(`${snapshotsAdded} written`) + ', '
      : '') +
    (snapshotsPassed
      ? chalk.bold.green(`${snapshotsPassed} passed`) + ', '
      : '') +
    `${snapshotsTotal} total`;

  const time = renderTime(runTime, estimatedTime, width);
  return [suites, tests, snapshots, time].join('\n');
};

const renderTime = (runTime, estimatedTime, width) => {
  // If we are more than one second over the estimated time, highlight it.
  const renderedTime =
    estimatedTime && runTime >= estimatedTime + 1
      ? chalk.bold.yellow(runTime + 's')
      : runTime + 's';
  let time = chalk.bold(`Time:`) + `        ${renderedTime}`;
  if (runTime < estimatedTime) {
    time += `, estimated ${estimatedTime}s`;
  }

  // Only show a progress bar if the test run is actually going to take
  // some time.
  if (estimatedTime > 2 && runTime < estimatedTime && width) {
    const availableWidth = Math.min(PROGRESS_BAR_WIDTH, width);
    const length = Math.min(
      Math.floor((runTime / estimatedTime) * availableWidth),
      availableWidth,
    );
    if (availableWidth >= 2) {
      time +=
        '\n' +
        chalk.green('█').repeat(length) +
        chalk.white('█').repeat(availableWidth - length);
    }
  }
  return time;
};

// word-wrap a string that contains ANSI escape sequences.
// ANSI escape sequences do not add to the string length.
export const wrapAnsiString = (string: string, terminalWidth: number) => {
  if (terminalWidth === 0) {
    // if the terminal width is zero, don't bother word-wrapping
    return string;
  }

  const ANSI_REGEXP = /[\u001b\u009b]\[\d{1,2}m/g;
  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = ANSI_REGEXP.exec(string))) {
    const ansi = match[0];
    const index = match['index'];
    if (index != lastIndex) {
      tokens.push(['string', string.slice(lastIndex, index)]);
    }
    tokens.push(['ansi', ansi]);
    lastIndex = index + ansi.length;
  }

  if (lastIndex != string.length - 1) {
    tokens.push(['string', string.slice(lastIndex, string.length)]);
  }

  let lastLineLength = 0;

  return tokens
    .reduce(
      (lines, [kind, token]) => {
        if (kind === 'string') {
          if (lastLineLength + token.length > terminalWidth) {
            while (token.length) {
              const chunk = token.slice(0, terminalWidth - lastLineLength);
              const remaining = token.slice(
                terminalWidth - lastLineLength,
                token.length,
              );
              lines[lines.length - 1] += chunk;
              lastLineLength += chunk.length;
              token = remaining;
              if (token.length) {
                lines.push('');
                lastLineLength = 0;
              }
            }
          } else {
            lines[lines.length - 1] += token;
            lastLineLength += token.length;
          }
        } else {
          lines[lines.length - 1] += token;
        }

        return lines;
      },
      [''],
    )
    .join('\n');
};
