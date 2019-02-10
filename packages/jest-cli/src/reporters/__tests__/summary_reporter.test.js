/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

import SummaryReporter from '../summary_reporter';

const env = {...process.env};
const now = Date.now;
const write = process.stderr.write;
const globalConfig = {
  rootDir: 'root',
  watch: false,
};

let results = [];

beforeEach(() => {
  process.env.npm_lifecycle_event = 'test';
  process.env.npm_lifecycle_script = 'jest';
  process.stderr.write = result => results.push(result);
  Date.now = () => 10;
});

afterEach(() => {
  results = [];
  process.env = env;
  process.stderr.write = write;
  Date.now = now;
});

test('snapshots needs update with npm test', () => {
  const aggregatedResults = {
    numFailedTestSuites: 1,
    numFailedTests: 1,
    numPassedTestSuites: 0,
    numTotalTestSuites: 1,
    numTotalTests: 1,
    snapshot: {
      filesUnmatched: 1,
      total: 2,
      uncheckedKeysByFile: [],
      unmatched: 2,
    },
    startTime: 0,
    testResults: {},
  };

  process.env.npm_config_user_agent = 'npm';
  const testReporter = new SummaryReporter(globalConfig);
  testReporter.onRunComplete(new Set(), aggregatedResults);
  expect(results.join('')).toMatchSnapshot();
});

test('snapshots needs update with yarn test', () => {
  const aggregatedResults = {
    numFailedTestSuites: 1,
    numFailedTests: 1,
    numPassedTestSuites: 0,
    numTotalTestSuites: 1,
    numTotalTests: 1,
    snapshot: {
      filesUnmatched: 1,
      total: 2,
      uncheckedKeysByFile: [],
      unmatched: 2,
    },
    startTime: 0,
    testResults: {},
  };

  process.env.npm_config_user_agent = 'yarn';
  const testReporter = new SummaryReporter(globalConfig);
  testReporter.onRunComplete(new Set(), aggregatedResults);
  expect(results.join('')).toMatchSnapshot();
});

test('snapshots all have results (no update)', () => {
  const aggregatedResults = {
    numFailedTestSuites: 1,
    numFailedTests: 1,
    numPassedTestSuites: 0,
    numTotalTestSuites: 1,
    numTotalTests: 1,
    snapshot: {
      added: 1,
      didUpdate: false,
      filesAdded: 1,
      filesRemoved: 1,
      filesUnmatched: 1,
      filesUpdated: 1,
      matched: 2,
      total: 2,
      unchecked: 1,
      uncheckedKeysByFile: [
        {
          filePath: 'path/to/suite_one',
          keys: ['unchecked snapshot 1'],
        },
      ],
      unmatched: 1,
      updated: 1,
    },
    startTime: 0,
    testResults: {},
  };

  const testReporter = new SummaryReporter(globalConfig);
  testReporter.onRunComplete(new Set(), aggregatedResults);
  expect(results.join('').replace(/\\/g, '/')).toMatchSnapshot();
});

test('snapshots all have results (after update)', () => {
  const aggregatedResults = {
    numFailedTestSuites: 1,
    numFailedTests: 1,
    numPassedTestSuites: 0,
    numTotalTestSuites: 1,
    numTotalTests: 1,
    snapshot: {
      added: 1,
      didUpdate: true,
      filesAdded: 1,
      filesRemoved: 1,
      filesUnmatched: 1,
      filesUpdated: 1,
      matched: 2,
      total: 2,
      unchecked: 1,
      uncheckedKeysByFile: [
        {
          filePath: 'path/to/suite_one',
          keys: ['unchecked snapshot 1'],
        },
      ],
      unmatched: 1,
      updated: 1,
    },
    startTime: 0,
    testResults: {},
  };

  const testReporter = new SummaryReporter(globalConfig);
  testReporter.onRunComplete(new Set(), aggregatedResults);
  expect(results.join('').replace(/\\/g, '/')).toMatchSnapshot();
});
