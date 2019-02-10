/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import fs from 'fs';
import path from 'path';
import runJest from '../runJest';

const snapshotDir = path.resolve(
  __dirname,
  '../snapshot-resolver/__snapshots__',
);
const snapshotFile = path.resolve(snapshotDir, 'snapshot.test.js.snap');

describe('Custom snapshot resolver', () => {
  const cleanup = () => {
    if (fs.existsSync(snapshotFile)) {
      fs.unlinkSync(snapshotFile);
    }
    if (fs.existsSync(snapshotDir)) {
      fs.rmdirSync(snapshotDir);
    }
  };

  beforeEach(cleanup);
  afterAll(cleanup);

  it('Resolves snapshot files using custom resolver', () => {
    const result = runJest('snapshot-resolver', ['-w=1', '--ci=false']);

    expect(result.stderr).toMatch('1 snapshot written from 1 test suite');

    // $FlowFixMe dynamic require
    const content = require(snapshotFile);
    expect(content).toHaveProperty(
      'snapshots are written to custom location 1',
    );
  });
});
