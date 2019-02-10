/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+jsinfra
 */

/* eslint-disable no-useless-concat */

'use strict';

import React from 'react';
import Unmocked from '../__test_modules__/Unmocked';
import Mocked from '../__test_modules__/Mocked';
import a from '../__test_modules__/a';
import b from '../__test_modules__/b';
import c from '../__test_modules__/c';
import d from '../__test_modules__/d';
import e from '../__test_modules__/e';
import jestBackticks from '../__test_modules__/jestBackticks';

// The virtual mock call below will be hoisted above this `require` call.
const virtualModule = require('virtual-module');

// These will all be hoisted above imports
jest.unmock('react');
jest.deepUnmock('../__test_modules__/Unmocked');
jest.unmock('../__test_modules__/c').unmock('../__test_modules__/d');
jest.mock('../__test_modules__/e', () => {
  if (!global.CALLS) {
    global.CALLS = 0;
  }
  global.CALLS++;

  return {
    _isMock: true,
    fn: () => {
      // The `jest.mock` transform will allow require, built-ins and globals.
      const path = require('path');
      const array = new Array(3);
      array[0] = path.sep;
      return jest.fn(() => array);
    },
  };
});
jest.mock(`../__test_modules__/jestBackticks`);
jest.mock('virtual-module', () => 'kiwi', {virtual: true});
// This has types that should be ignored by the out-of-scope variables check.
jest.mock('has-flow-types', () => (props: {children: mixed}) => 3, {
  virtual: true,
});

// These will not be hoisted
jest.unmock('../__test_modules__/a').dontMock('../__test_modules__/b');
jest.unmock('../__test_modules__/' + 'c');
jest.dontMock('../__test_modules__/Mocked');

// This must not throw an error
const myObject = {mock: () => {}};
myObject.mock('apple', 27);

// Variable names prefixed with `mock` (ignore case) should not throw as out-of-scope
const MockMethods = () => {};
jest.mock('../__test_modules__/f', () => MockMethods);

describe('babel-plugin-jest-hoist', () => {
  it('does not throw during transform', () => {
    const object = {};
    object.__defineGetter__('foo', () => 'bar');
    expect(object.foo).toEqual('bar');
  });

  it('hoists react unmock call before imports', () => {
    expect(typeof React).toEqual('object');
    expect(React.isValidElement.mock).toBe(undefined);
  });

  it('hoists unmocked modules before imports', () => {
    expect(Unmocked._isMockFunction).toBe(undefined);
    expect(new Unmocked().isUnmocked).toEqual(true);

    expect(c._isMockFunction).toBe(undefined);
    expect(c()).toEqual('unmocked');

    expect(d._isMockFunction).toBe(undefined);
    expect(d()).toEqual('unmocked');
  });

  it('hoists mock call with 2 arguments', () => {
    const path = require('path');

    expect(e._isMock).toBe(true);

    const mockFn = e.fn();
    expect(mockFn()).toEqual([path.sep, undefined, undefined]);
  });

  it('only executes the module factories once', () => {
    jest.resetModules();

    global.CALLS = 0;

    require('../__test_modules__/e');
    expect(global.CALLS).toEqual(1);

    require('../__test_modules__/e');
    expect(global.CALLS).toEqual(1);

    delete global.CALLS;
  });

  it('does not hoist dontMock calls before imports', () => {
    expect(Mocked._isMockFunction).toBe(true);
    expect(new Mocked().isMocked).toEqual(undefined);

    expect(a._isMockFunction).toBe(true);
    expect(a()).toEqual(undefined);

    expect(b._isMockFunction).toBe(true);
    expect(b()).toEqual(undefined);
  });

  it('requires modules that also call jest.mock', () => {
    require('../mockFile');
    const mock = require('../banana');
    expect(mock).toEqual('apple');
  });

  it('works with virtual modules', () => {
    expect(virtualModule).toBe('kiwi');
  });

  it('works if the file name is mocked via backticks and defined in the "__mocks__" directory', () => {
    expect(jestBackticks.name).toBe('backticks-with-jest');
  });
});
