/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import runJest from '../runJest';

test('`jest.resetAllMocks` should work on using `jest.generateFromMetadata`', () => {
  const result = runJest('reset-all-mocks');
  expect(result.exitCode).toBe(0);
});
