/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import {cleanup} from '../Utils';
import {json as runWithJson} from '../runJest';

const testDir = path.resolve(__dirname, '../snapshot-serializers');
const snapshotsDir = path.resolve(testDir, '__tests__/__snapshots__');
const snapshotPath = path.resolve(snapshotsDir, 'snapshot.test.js.snap');

const runAndAssert = () => {
  const result = runWithJson('snapshot-serializers', [
    '-w=1',
    '--ci=false',
    '--no-cache',
  ]);
  const json = result.json;
  expect(json.numTotalTests).toBe(7);
  expect(json.numPassedTests).toBe(7);
  expect(json.numFailedTests).toBe(0);
  expect(json.numPendingTests).toBe(0);
  expect(result.status).toBe(0);
};

describe('Snapshot serializers', () => {
  beforeEach(() => cleanup(snapshotsDir));
  afterEach(() => cleanup(snapshotsDir));

  it('renders snapshot', () => {
    runAndAssert();
    // $FlowFixMe dynamic require
    const snapshot = require(snapshotPath);
    expect(snapshot).toMatchSnapshot();
  });

  it('compares snapshots correctly', () => {
    // run twice, second run compares result with snapshot from first run
    runAndAssert();
    runAndAssert();
  });
});
