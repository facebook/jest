/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {resolve} from 'path';
import {wrap} from 'jest-snapshot-serializer-raw';
import {extractSummary, run} from '../Utils';

const dir = resolve(__dirname, '../run-programmatically-multiple-projects');

test('run programmatically with multiple projects', () => {
  const {stderr, exitCode} = run(`node run-jest.js`, dir);
  const {summary, rest} = extractSummary(stderr);
  expect(exitCode).toEqual(0);
  expect(wrap(summary)).toMatchSnapshot('summary');
  expect(wrap(rest)).toMatchSnapshot('rest');
});
