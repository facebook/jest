/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

describe('test/it.todo error throwing', () => {
  it('it throws error when given no arguments', () => {
    expect(() => {
      it.todo();
    }).toThrowError('Todo must be called with only a description.');
  });
  it('it throws error when given more than one argument', () => {
    expect(() => {
      it.todo('test1', () => {});
    }).toThrowError('Todo must be called with only a description.');
  });
  it('it throws error when given none string description', () => {
    expect(() => {
      it.todo(() => {});
    }).toThrowError('Todo must be called with only a description.');
  });
});
