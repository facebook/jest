/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

function* someFunc() {
  return 3;
}

describe('generators', () => {
  beforeEach(function*() {
    // This shouldn't throw
    yield someFunc();
  });

  it('in spec', function*() {
    const data = yield someFunc();

    expect(data).toBe(3);
  });
});
