/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {extractSummary} from '../Utils';
import {json as runWithJson} from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

test('testNamePattern', () => {
  const {stderr, status} = runWithJson('test-name-pattern', [
    '--testNamePattern',
    'should match',
  ]);
  const {summary} = extractSummary(stderr);

  expect(status).toBe(0);
  expect(wrap(summary)).toMatchSnapshot();
});
