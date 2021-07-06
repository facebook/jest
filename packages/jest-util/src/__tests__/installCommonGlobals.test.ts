/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createContext, runInContext} from 'vm';

let installCommonGlobals: typeof import('../installCommonGlobals').default;
let fake: jest.Mock;

function getGlobal(): typeof globalThis {
  return runInContext('this', createContext());
}

beforeEach(() => {
  fake = jest.fn();
  // @ts-expect-error
  global.DTRACE_NET_SERVER_CONNECTION = fake;

  installCommonGlobals = require('../installCommonGlobals').default;
});

it('returns the passed object', () => {
  const myGlobal = getGlobal();

  expect(installCommonGlobals(myGlobal, {})).toBe(myGlobal);
});

it('turns a V8 global object into a Node global object', () => {
  const myGlobal = installCommonGlobals(getGlobal(), {});

  expect(myGlobal.process).toBeDefined();
  expect(myGlobal.DTRACE_NET_SERVER_CONNECTION).toBeDefined();

  expect(myGlobal.DTRACE_NET_SERVER_CONNECTION).not.toBe(fake);
  myGlobal.DTRACE_NET_SERVER_CONNECTION();
  expect(fake.mock.calls.length).toBe(1);
});
