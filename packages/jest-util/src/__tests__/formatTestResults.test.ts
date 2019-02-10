/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {TestResult} from '@jest/types';
import formatTestResults from '../formatTestResults';

describe('formatTestResults', () => {
  const assertion = {
    fullName: 'TestedModule#aMethod when some condition is met returns true',
    status: 'passed',
    title: 'returns true',
  };

  const results: TestResult.AggregatedResult = {
    testResults: [
      {
        numFailingTests: 0,
        perfStats: {end: 2, start: 1},
        // @ts-ignore
        testResults: [assertion],
      },
    ],
  };

  it('includes test full name', () => {
    const result = formatTestResults(results, null, null);
    expect(result.testResults[0].assertionResults[0].fullName).toEqual(
      assertion.fullName,
    );
  });
});
