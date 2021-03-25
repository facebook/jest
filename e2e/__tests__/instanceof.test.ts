/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import runJest from '../runJest';

test('suite with `instanceof` checks', () => {
  const {status} = runJest('instanceof');

  expect(status).toBe(0);
});
