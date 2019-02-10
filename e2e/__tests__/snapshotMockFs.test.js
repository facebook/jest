/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import rimraf from 'rimraf';
import {wrap} from 'jest-snapshot-serializer-raw';
import {extractSummary} from '../Utils';
import {json as runJestJson} from '../runJest';

const DIR = path.resolve(__dirname, '../snapshot-mock-fs');
const snapshotDir = path.resolve(DIR, '__tests__/__snapshots__');
const snapshotFile = path.resolve(snapshotDir, 'snapshot.test.js.snap');

beforeEach(() => rimraf.sync(snapshotDir));
afterAll(() => rimraf.sync(snapshotDir));

test('store snapshot even if fs is mocked', () => {
  const {json, status, stderr} = runJestJson(DIR, ['--ci=false']);

  expect(status).toBe(0);
  expect(json.numTotalTests).toBe(1);
  expect(json.numPassedTests).toBe(1);

  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(wrap(extractSummary(stderr).summary)).toMatchSnapshot();

  // $FlowFixMe dynamic require
  const content = require(snapshotFile);
  expect(content['snapshot 1']).toBe(`
Object {
  "foo": "bar",
}
`);
});
