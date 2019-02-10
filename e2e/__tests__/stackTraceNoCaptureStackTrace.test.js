/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

it('prints a usable stack trace even if no Error.captureStackTrace', () => {
  const {stderr, status} = runJest('stack-trace-no-capture-stack-trace');
  expect(stderr).not.toMatch('Error.captureStackTrace is not a function');
  expect(status).toBe(1);
});
