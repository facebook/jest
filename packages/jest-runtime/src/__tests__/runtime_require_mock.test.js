/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const path = require('path');

let createRuntime;
const consoleWarn = console.warn;

describe('Runtime', () => {
  beforeEach(() => {
    createRuntime = require('createRuntime');
  });

  afterEach(() => {
    console.warn = consoleWarn;
  });

  describe('requireMock', () => {
    it('uses manual mocks before attempting to automock', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          runtime.__mockRootPath,
          'ManuallyMocked',
        );
        expect(exports.isManualMockModule).toBe(true);
      }));

    it('can resolve modules that are only referenced from mocks', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          runtime.__mockRootPath,
          'ManuallyMocked',
        );
        expect(exports.onlyRequiredFromMockModuleValue).toBe(
          'banana banana banana',
        );
      }));

    it('stores and re-uses manual mock exports', () =>
      createRuntime(__filename).then(runtime => {
        let exports = runtime.requireMock(
          runtime.__mockRootPath,
          'ManuallyMocked',
        );
        exports.setModuleStateValue('test value');
        exports = runtime.requireMock(runtime.__mockRootPath, 'ManuallyMocked');
        expect(exports.getModuleStateValue()).toBe('test value');
      }));

    it('automocks haste modules without a manual mock', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          runtime.__mockRootPath,
          'RegularModule',
        );
        expect(exports.getModuleStateValue._isMockFunction).toBe(true);
      }));

    it('automocks relative-path modules without a file extension', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          __filename,
          './test_root/RegularModule',
        );
        expect(exports.getModuleStateValue._isMockFunction).toBe(true);
      }));

    it('automocks relative-path modules with a file extension', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          __filename,
          './test_root/RegularModule.js',
        );
        expect(exports.getModuleStateValue._isMockFunction).toBe(true);
      }));

    it('just falls back when loading a native module', () =>
      createRuntime(__filename).then(runtime => {
        let error;
        // Okay so this is a really WAT way to test this, but we
        // are going to require an empty .node file which should
        // throw an error letting us know that the file is too
        // short. If it does not (it gives another error) then we
        // are not correctly falling back to 'native' require.
        try {
          runtime.requireMock(__filename, './test_root/NativeModule.node');
        } catch (e) {
          error = e;
        } finally {
          expect(error.message).toMatch(
            /NativeModule.node\: file too short|not a valid Win\d+ application/,
          );
        }
      }));

    it('stores and re-uses automocked haste exports', () =>
      createRuntime(__filename).then(runtime => {
        let exports = runtime.requireMock(
          runtime.__mockRootPath,
          'RegularModule',
        );
        exports.externalMutation = 'test value';
        exports = runtime.requireMock(runtime.__mockRootPath, 'RegularModule');
        expect(exports.externalMutation).toBe('test value');
      }));

    it('stores and re-uses automocked relative-path modules', () =>
      createRuntime(__filename).then(runtime => {
        let exports = runtime.requireMock(
          __filename,
          './test_root/RegularModule',
        );
        exports.externalMutation = 'test value';
        exports = runtime.requireMock(__filename, './test_root/RegularModule');
        expect(exports.externalMutation).toBe('test value');
      }));

    it('multiple node core modules returns correct module', () =>
      createRuntime(__filename).then(runtime => {
        runtime.requireMock(runtime.__mockRootPath, 'fs');
        expect(
          runtime.requireMock(runtime.__mockRootPath, 'events').EventEmitter,
        ).toBeDefined();
      }));

    it('throws on non-existent haste modules', () =>
      createRuntime(__filename).then(runtime => {
        expect(() => {
          runtime.requireMock(runtime.__mockRootPath, 'DoesntExist');
        }).toThrow();
      }));

    it('uses the closest manual mock when duplicates exist', () => {
      console.warn = jest.fn();
      return createRuntime(__filename, {
        rootDir: path.resolve(
          path.dirname(__filename),
          'test_root_with_dup_mocks',
        ),
      }).then(runtime => {
        expect(console.warn).toBeCalled();
        const exports1 = runtime.requireMock(
          runtime.__mockRootPath,
          './subdir1/my_module',
        );
        expect(exports1.modulePath).toEqual('subdir1/__mocks__/my_module.js');

        const exports2 = runtime.requireMock(
          runtime.__mockRootPath,
          './subdir2/my_module',
        );
        expect(exports2.modulePath).toEqual('subdir2/__mocks__/my_module.js');
      });
    });

    it('uses manual mocks when using a custom resolver', () =>
      createRuntime(__filename, {
        // using the default resolver as a custom resolver
        resolver: require.resolve('./defaultResolver.js'),
      }).then(runtime => {
        const exports = runtime.requireMock(
          runtime.__mockRootPath,
          './ManuallyMocked',
        );

        expect(exports.isManualMockModule).toBe(true);
      }));

    it('provides `require.main` in mock', () =>
      createRuntime(__filename).then(runtime => {
        runtime.setMock(__filename, 'export_main', () => module, {
          virtual: true,
        });
        const mainModule = runtime.requireMock(__filename, 'export_main');
        expect(mainModule).toBe(module);
      }));
  });
});
