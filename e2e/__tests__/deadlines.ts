/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {skipSuiteOnJasmine} from '@jest/test-utils';
import runJest from '../runJest';

skipSuiteOnJasmine();

it('self checks the deadlines are within bounds', () => {
  const result = runJest('deadlines', ['timings.js']);
  expect(result.exitCode).toBe(0);
});
