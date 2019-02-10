/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

'use strict';

let circusIt;

// using jest-jasmine2's 'it' to test jest-circus's 'it'. Had to differentiate
// the two with this alias.

const aliasCircusIt = () => {
  const {it} = require('../index.js');
  circusIt = it;
};

aliasCircusIt();

describe('test/it.todo error throwing', () => {
  it('todo throws error when given no arguments', () => {
    expect(() => {
      // $FlowFixMe: Testing runitme errors here
      circusIt.todo();
    }).toThrowError('Todo must be called with only a description.');
  });
  it('todo throws error when given more than one argument', () => {
    expect(() => {
      circusIt.todo('test1', () => {});
    }).toThrowError('Todo must be called with only a description.');
  });
  it('todo throws error when given none string description', () => {
    expect(() => {
      // $FlowFixMe: Testing runitme errors here
      circusIt.todo(() => {});
    }).toThrowError('Todo must be called with only a description.');
  });
});
