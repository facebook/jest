/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import getSnapshotSummary from '../get_snapshot_summary';

const UPDATE_COMMAND = 'press --u';

const globalConfig = {
  rootDir: 'root',
};

test('creates a snapshot summary', () => {
  const snapshots = {
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
  };

  expect(
    getSnapshotSummary(snapshots, globalConfig, UPDATE_COMMAND)
      .join('\n')
      .replace(/\\/g, '/'),
  ).toMatchSnapshot();
});

test('creates a snapshot summary after an update', () => {
  const snapshots = {
    added: 1,
    didUpdate: true,
    filesAdded: 1,
    filesRemoved: 1,
    filesUnmatched: 1,
    filesUpdated: 1,
    unchecked: 1,
    uncheckedKeysByFile: [
      {
        filePath: 'path/to/suite_one',
        keys: ['unchecked snapshot 1'],
      },
    ],
    unmatched: 1,
    updated: 1,
  };

  expect(
    getSnapshotSummary(snapshots, globalConfig, UPDATE_COMMAND)
      .join('\n')
      .replace(/\\/g, '/'),
  ).toMatchSnapshot();
});

it('creates a snapshot summary with multiple snapshot being written/updated', () => {
  const snapshots = {
    added: 2,
    didUpdate: false,
    filesAdded: 2,
    filesRemoved: 2,
    filesUnmatched: 2,
    filesUpdated: 2,
    unchecked: 2,
    uncheckedKeysByFile: [
      {
        filePath: 'path/to/suite_one',
        keys: ['unchecked snapshot 1'],
      },
      {
        filePath: 'path/to/suite_two',
        keys: ['unchecked snapshot 2'],
      },
    ],
    unmatched: 2,
    updated: 2,
  };

  expect(
    getSnapshotSummary(snapshots, globalConfig, UPDATE_COMMAND)
      .join('\n')
      .replace(/\\/g, '/'),
  ).toMatchSnapshot();
});

it('returns nothing if there are no updates', () => {
  const snapshots = {
    added: 0,
    didUpdate: false,
    filesAdded: 0,
    filesRemoved: 0,
    filesUnmatched: 0,
    filesUpdated: 0,
    unchecked: 0,
    uncheckedKeysByFile: [],
    unmatched: 0,
    updated: 0,
  };
  expect(
    getSnapshotSummary(snapshots, globalConfig, UPDATE_COMMAND).join('\n'),
  ).toMatchSnapshot();
});
