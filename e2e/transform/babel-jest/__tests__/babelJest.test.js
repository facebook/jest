/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

require('../this-directory-is-covered/excludedFromCoverage');

it('strips flowtypes using babel-jest and .babelrc', () => {
  const a: string = 'a';
  expect(a).toBe('a');
});
