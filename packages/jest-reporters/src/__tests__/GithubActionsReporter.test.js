/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

let GithubActionsReporter;

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
  process.stderr.write = write;
});

test('snapshots all have results (no update)', () => {
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
                expect(received).toBe(expected) // Object.is equality

                Expected: "b"
                Received: "a"

                  121 | 
                  122 | 		expect( 'a' ).toBe( 'a' );
                > 123 | 		expect( 'a' ).toBe( 'b' );
                      | 		              ^
                  124 | 	} );
                  125 | } );
                  126 | 

                  at Object.<anonymous> (/home/runner/work/jest/jest/some.test.js:123:17)
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

  requireReporter();
  const testReporter = new GithubActionsReporter(globalConfig);
  testReporter.onRunComplete(new Set(), aggregatedResults);
  expect(results.join('').replace(/\\/g, '/')).toMatchSnapshot();
});
