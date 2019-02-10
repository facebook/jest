/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// fails because there is no `strip-flow-types` transform
const thisFunctionIsNeverInstrumented = (a: string) => null;

test('this is never called', () => {
  thisFunctionIsNeverInstrumented();
});
