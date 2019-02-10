/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('use the custom resolver', () => {
  const result = runJest('custom-resolver');
  expect(result.status).toBe(0);
});
