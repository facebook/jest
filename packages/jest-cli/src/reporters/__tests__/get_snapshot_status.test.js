/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import getSnapshotStatus from '../get_snapshot_status';

test('Retrieves the snapshot status', () => {
  const snapshotResult = {
    added: 1,
    fileDeleted: false,
    matched: 1,
    unchecked: 1,
    uncheckedKeys: ['test suite with unchecked snapshot'],
    unmatched: 1,
    updated: 1,
  };

  expect(getSnapshotStatus(snapshotResult, false)).toMatchSnapshot();
});

test('Shows no snapshot updates if all snapshots matched', () => {
  const snapshotResult = {
    added: 0,
    fileDeleted: false,
    matched: 1,
    unchecked: 0,
    uncheckedKeys: [],
    unmatched: 0,
    updated: 0,
  };

  expect(getSnapshotStatus(snapshotResult, true)).toMatchSnapshot();
});

test('Retrieves the snapshot status after a snapshot update', () => {
  const snapshotResult = {
    added: 2,
    fileDeleted: true,
    matched: 2,
    unchecked: 2,
    uncheckedKeys: [
      'first test suite with unchecked snapshot',
      'second test suite with unchecked snapshot',
    ],
    unmatched: 2,
    updated: 2,
  };

  expect(getSnapshotStatus(snapshotResult, true)).toMatchSnapshot();
});
