/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {extractSummary} from '../Utils';
import runJest from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

test('console printing', () => {
  const {stderr, status} = runJest('console-after-teardown');
  const {rest} = extractSummary(stderr);

  expect(status).toBe(0);
  expect(wrap(rest)).toMatchSnapshot();
});
