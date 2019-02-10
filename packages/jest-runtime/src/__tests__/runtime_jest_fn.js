/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

let createRuntime;

describe('Runtime', () => {
  beforeEach(() => {
    createRuntime = require('createRuntime');
  });

  describe('jest.fn', () => {
    it('creates mock functions', () =>
      createRuntime(__filename).then(runtime => {
        const root = runtime.requireModule(runtime.__mockRootPath);
        const mock = root.jest.fn();
        expect(mock._isMockFunction).toBe(true);
        mock();
        expect(mock).toBeCalled();
      }));

    it('creates mock functions with mock implementations', () =>
      createRuntime(__filename).then(runtime => {
        const root = runtime.requireModule(runtime.__mockRootPath);
        const mock = root.jest.fn(string => string + ' implementation');
        expect(mock._isMockFunction).toBe(true);
        const value = mock('mock');
        expect(value).toEqual('mock implementation');
        expect(mock).toBeCalled();
      }));
  });

  describe('jest.isMockFunction', () => {
    it('recognizes a mocked function', () =>
      createRuntime(__filename).then(runtime => {
        const root = runtime.requireModule(runtime.__mockRootPath);
        const mock = root.jest.fn();
        expect(root.jest.isMockFunction(() => {})).toBe(false);
        expect(root.jest.isMockFunction(mock)).toBe(true);
      }));
  });

  describe('jest.clearAllMocks', () => {
    it('clears all mocks', () =>
      createRuntime(__filename).then(runtime => {
        const root = runtime.requireModule(runtime.__mockRootPath);

        const mock1 = root.jest.fn();
        mock1();

        const mock2 = root.jest.fn();
        mock2();

        expect(mock1).toBeCalled();
        expect(mock2).toBeCalled();

        runtime.clearAllMocks();

        expect(mock1).not.toBeCalled();
        expect(mock2).not.toBeCalled();
      }));
  });
});
