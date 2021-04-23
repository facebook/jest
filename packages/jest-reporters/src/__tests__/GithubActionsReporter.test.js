/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

let GithubActionsReporter;

const env = {...process.env};
const write = process.stderr.write;
const globalConfig = {
  rootDir: 'root',
  watch: false,
};

let results = [];

function requireReporter() {
  jest.isolateModules(() => {
    GithubActionsReporter = require('../GithubActionsReporter').default;
  });
}

beforeEach(() => {
  process.stderr.write = result => results.push(result);
});

afterEach(() => {
  results = [];
  process.env = env;
  process.stderr.write = write;
});

const aggregatedResults = {
  numFailedTestSuites: 1,
  numFailedTests: 1,
  numPassedTestSuites: 0,
  numTotalTestSuites: 1,
  numTotalTests: 1,
  snapshot: {
    added: 0,
    didUpdate: false,
    failure: false,
    filesAdded: 0,
    filesRemoved: 0,
    filesRemovedList: [],
    filesUnmatched: 0,
    filesUpdated: 0,
    matched: 0,
    total: 0,
    unchecked: 0,
    uncheckedKeysByFile: [],
    unmatched: 0,
    updated: 0,
  },
  startTime: 0,
  success: false,
  testResults: [
    {
      numFailingTests: 1,
      numPassingTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      openHandles: [],
      perfStats: {
        end: 1234,
        runtime: 1234,
        slow: false,
        start: 0,
      },
      skipped: false,
      snapshot: {
        added: 0,
        fileDeleted: false,
        matched: 0,
        unchecked: 0,
        uncheckedKeys: [],
        unmatched: 0,
        updated: 0,
      },
      testFilePath: '/home/runner/work/jest/jest/some.test.js',
      testResults: [
        {
          ancestorTitles: [Array],
          duration: 7,
          failureDetails: [Array],
          failureMessages: [
            `
              Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n
              \n
              Expected: \u001b[32m\"b\"\u001b[39m\n
              Received: \u001b[31m\"a\"\u001b[39m\n
                  at Object.<anonymous> (/home/runner/work/jest/jest/some.test.js:4:17)\n
                  at Object.asyncJestTest (/home/runner/work/jest/jest/node_modules/jest-jasmine2/build/jasmineAsyncInstall.js:106:37)\n
                  at /home/runner/work/jest/jest/node_modules/jest-jasmine2/build/queueRunner.js:45:12\n
                  at new Promise (<anonymous>)\n
                  at mapper (/home/runner/work/jest/jest/node_modules/jest-jasmine2/build/queueRunner.js:28:19)\n
                  at /home/runner/work/jest/jest/node_modules/jest-jasmine2/build/queueRunner.js:75:41\n
                  at processTicksAndRejections (internal/process/task_queues.js:93:5)
            `,
          ],
          fullName: 'asserts that a === b',
          location: null,
          numPassingAsserts: 0,
          status: 'failed',
          title: 'asserts that a === b',
        },
      ],
    },
  ],
};

test("reporter returns empty string if GITHUB_ACTIONS isn't set", () => {
  requireReporter();
  const testReporter = new GithubActionsReporter(globalConfig);
  testReporter.onRunComplete(new Set(), aggregatedResults);
  expect(results.join('').replace(/\\/g, '/')).toMatchSnapshot();
});

test('reporter extracts the correct filename, line, and column', () => {
  process.env.GITHUB_ACTIONS = true;

  requireReporter();
  const testReporter = new GithubActionsReporter(globalConfig);
  testReporter.onRunComplete(new Set(), aggregatedResults);
  expect(results.join('').replace(/\\/g, '/')).toMatchSnapshot();
});
