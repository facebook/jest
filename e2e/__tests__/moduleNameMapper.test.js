/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest, {json as runWithJson} from '../runJest';
import {extractSummary} from '../Utils';
import {wrap} from 'jest-snapshot-serializer-raw';

test('moduleNameMapper wrong configuration', () => {
  const {stderr, status} = runJest('module-name-mapper-wrong-config');
  const {rest} = extractSummary(stderr);

  expect(status).toBe(1);
  expect(wrap(rest)).toMatchSnapshot();
});

test('moduleNameMapper correct configuration', () => {
  const {stderr, status} = runJest('module-name-mapper-correct-config', [], {
    stripAnsi: true,
  });
  const {rest} = extractSummary(stderr);

  expect(status).toBe(0);
  expect(wrap(rest)).toMatchSnapshot();
});

test('moduleNameMapper with mocking', () => {
  const {json} = runWithJson('module-name-mapper-mock');
  expect(json.numTotalTests).toBe(2);
  expect(json.success).toBe(true);
});
