/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('expect works correctly with RegExps created inside a VM', () => {
  const result = runJest('expect-in-vm');
  expect(result.status).toBe(0);
});
