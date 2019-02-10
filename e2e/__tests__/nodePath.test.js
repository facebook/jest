/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('supports NODE_PATH', () => {
  // $FlowFixMe after adding @flow to this test this seems to be a real bug
  const result = runJest('node-path', [], {
    nodePath: ['../node-path/src'],
  });
  expect(result.status).toBe(0);
});
