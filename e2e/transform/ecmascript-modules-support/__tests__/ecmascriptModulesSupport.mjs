/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

import {foo} from '../src/module';

it('can be used with mjs files using babel-jest', () => {
  expect(foo()).toBe('a');
});
