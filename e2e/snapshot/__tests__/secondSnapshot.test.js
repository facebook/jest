/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+jsinfra
 */
'use strict';

describe('snapshot', () => {
  it('works with plain objects and the title has `escape` characters', () => {
    const test = {
      a: 1,
      b: '2',
      c: 'three`',
      d: 'vier',
    };
    expect(test).toMatchSnapshot();
  });
});
