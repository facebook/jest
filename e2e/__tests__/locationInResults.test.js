/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {json as runWithJson} from '../runJest';
import {isJestCircusRun} from '../../scripts/ConditionalTest';

it('defaults to null for location', () => {
  const {json: result} = runWithJson('location-in-results');

  const assertions = result.testResults[0].assertionResults;
  expect(result.success).toBe(true);
  expect(result.numTotalTests).toBe(6);
  expect(assertions[0].location).toBeNull();
  expect(assertions[1].location).toBeNull();
  expect(assertions[2].location).toBeNull();
  expect(assertions[3].location).toBeNull();
  expect(assertions[4].location).toBeNull();
  expect(assertions[5].location).toBeNull();
});

it('adds correct location info when provided with flag', () => {
  const {json: result} = runWithJson('location-in-results', [
    '--testLocationInResults',
  ]);

  const assertions = result.testResults[0].assertionResults;
  expect(result.success).toBe(true);
  expect(result.numTotalTests).toBe(6);
  expect(assertions[0].location).toEqual({
    column: 1,
    line: 12,
  });

  expect(assertions[1].location).toEqual({
    column: 1,
    line: 16,
  });

  expect(assertions[2].location).toEqual({
    column: 1,
    line: 20,
  });

  // Technically the column should be 3, but callsites is not correct.
  // jest-circus uses stack-utils + asyncErrors which resolves this.
  expect(assertions[3].location).toEqual({
    column: isJestCircusRun() ? 3 : 2,
    line: 25,
  });

  expect(assertions[4].location).toEqual({
    column: isJestCircusRun() ? 3 : 2,
    line: 29,
  });

  expect(assertions[5].location).toEqual({
    column: isJestCircusRun() ? 3 : 2,
    line: 33,
  });
});
