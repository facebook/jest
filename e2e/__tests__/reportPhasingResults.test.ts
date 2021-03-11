/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {skipSuiteOnJasmine} from '@jest/test-utils';
import {json} from '../runJest';

const MASKED_FOR_SNAPSHOT = 987654321;

skipSuiteOnJasmine();

describe('phasing result reporting', () => {
  it('has extra results', () => {
    const result = json('report-phasing-results', ['--reportPhasingResults']);
    expect(result.exitCode).toBe(0);
    expect(result.json.testResults).toHaveLength(1);
    const testResult = result.json.testResults[0];
    for (const assertionResult of testResult.assertionResults) {
      expect(assertionResult.duration).toBeGreaterThanOrEqual(0);
      assertionResult.duration = MASKED_FOR_SNAPSHOT;
    }
    expect(testResult.assertionResults).toMatchSnapshot();
  });
});
