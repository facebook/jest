/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {json as runWithJson} from '../runJest';

it('should transform linked modules', () => {
  const {json: result} = runWithJson('transform-linked-modules', [
    '--no-cache',
  ]);

  expect(result.success).toBe(true);
  expect(result.numTotalTests).toBe(2);
});
