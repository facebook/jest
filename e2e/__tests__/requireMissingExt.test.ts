/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import wrap from 'jest-snapshot-serializer-raw';
import {extractSummary, run} from '../Utils';
import runJest from '../runJest';

const dir = path.resolve(__dirname, '../require-missing-ext');

beforeEach(() => {
  run('yarn', dir);
});

test('shows a proper error from deep requires', () => {
  const {stderr} = runJest(dir);
  const {rest} = extractSummary(stderr);

  expect(wrap(rest)).toMatchSnapshot();
});
