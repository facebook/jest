/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const fakeChalk = jest.requireActual('../fakeChalk');

describe('Fake Chalk', () => {
  it('returns input when invoked', () => {
    expect(fakeChalk.red('yo')).toEqual('yo');
  });

  it('supports chaining', () => {
    expect(fakeChalk.red.blue('yo')).toEqual('yo');
  });
});
