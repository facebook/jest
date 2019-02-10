/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import getFailedSnapshotTests from '../getFailedSnapshotTests';

test('return a list of path', () => {
  const targetFilename = 'somewhere.js';
  const param = {
    numFailedTests: 1,
    testResults: [
      {
        snapshot: {
          unmatched: 1,
        },
        testFilePath: targetFilename,
      },
    ],
  };
  // @ts-ignore
  expect(getFailedSnapshotTests(param)).toEqual([targetFilename]);
});

test('handle missing snapshot object', () => {
  const targetFilename = 'somewhere.js';
  const param = {
    numFailedTests: 1,
    testResults: [
      {
        testFilePath: targetFilename,
      },
    ],
  };
  // @ts-ignore
  expect(getFailedSnapshotTests(param)).toEqual([]);
});

test('handle missing testResults object', () => {
  const param = {
    numFailedTests: 1,
  };
  // @ts-ignore
  expect(getFailedSnapshotTests(param)).toEqual([]);
});

test('return empty if not failed tests', () => {
  const param = {
    numFailedTests: 0,
  };
  // @ts-ignore
  expect(getFailedSnapshotTests(param)).toEqual([]);
});

test('return empty if not failed snapshot tests', () => {
  const targetFilename = 'somewhere.js';
  const param = {
    numFailedTests: 0,
    testResults: [
      {
        snapshot: {
          unmatched: 0,
        },
        testFilePath: targetFilename,
      },
    ],
  };
  // @ts-ignore
  expect(getFailedSnapshotTests(param)).toEqual([]);
});
