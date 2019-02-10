/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable no-throw-literal */
'use strict';

describe('error stack trace', () => {
  it('fails', () => {
    throw new Error('this is unexpected.');
  });

  it('fails strings', () => {
    throw 'this is a string.';
  });

  it('tests', () => {
    jest.unmock('this-module-does-not-exist');
  });
});
