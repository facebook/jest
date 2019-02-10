/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import runJest from '../runJest';
import {extractSummary} from '../Utils';
import {wrap} from 'jest-snapshot-serializer-raw';
const dir = path.resolve(__dirname, '../expect-async-matcher');

test('works with passing tests', () => {
  const result = runJest(dir, ['success.test.js']);
  expect(result.status).toBe(0);
});

test('shows the correct errors in stderr when failing tests', () => {
  const result = runJest(dir, ['failure.test.js']);

  expect(result.status).toBe(1);

  const rest = extractSummary(result.stderr)
    .rest.split('\n')
    .filter(line => line.indexOf('packages/expect/build/index.js') === -1)
    .join('\n');

  expect(wrap(rest)).toMatchSnapshot();
});
