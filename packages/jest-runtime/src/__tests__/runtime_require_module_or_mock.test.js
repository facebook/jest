/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const moduleNameMapper = {
  '\\.css$': '<rootDir>/__mocks__/ManuallyMocked',
  '^[./a-zA-Z0-9$_-]+.png$': 'RelativeImageStub',
  '^image![a-zA-Z0-9$_-]+$': 'global_image_stub',
  mappedToDirectory: '<rootDir>/MyDirectoryModule',
  mappedToModule: '<rootDir>/TestModuleNameMapperResolution',
  mappedToPath: '<rootDir>/global_image_stub.js',
  'module/name/(.*)': '<rootDir>/mapped_module_$1.js',
};

let createRuntime;

beforeEach(() => {
  createRuntime = require('createRuntime');
});

it('mocks modules by default when using automocking', () =>
  createRuntime(__filename, {
    automock: true,
    moduleNameMapper,
  }).then(runtime => {
    const exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'RegularModule',
    );
    expect(exports.setModuleStateValue._isMockFunction).toBe(true);
  }));

it(`doesn't mock modules when explicitly unmocked when using automocking`, () =>
  createRuntime(__filename, {
    automock: true,
    moduleNameMapper,
  }).then(runtime => {
    const root = runtime.requireModule(runtime.__mockRootPath);
    root.jest.unmock('RegularModule');
    const exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'RegularModule',
    );
    expect(exports.isRealModule).toBe(true);
  }));

it(`doesn't mock modules when explicitly unmocked via a different name`, () =>
  createRuntime(__filename, {
    automock: true,
    moduleNameMapper,
  }).then(runtime => {
    const root = runtime.requireModule(runtime.__mockRootPath);
    root.jest.unmock('./RegularModule');
    const exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'RegularModule',
    );
    expect(exports.isRealModule).toBe(true);
  }));

it(`doesn't mock modules when disableAutomock() has been called`, () =>
  createRuntime(__filename, {moduleNameMapper}).then(runtime => {
    const root = runtime.requireModule(runtime.__mockRootPath);
    root.jest.disableAutomock();
    const exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'RegularModule',
    );
    expect(exports.isRealModule).toBe(true);
  }));

it('uses manual mock when automocking on and mock is available', () =>
  createRuntime(__filename, {
    automock: true,
    moduleNameMapper,
  }).then(runtime => {
    const exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'ManuallyMocked',
    );
    expect(exports.isManualMockModule).toBe(true);
  }));

it('does not use manual mock when automocking is off and a real module is available', () =>
  createRuntime(__filename, {moduleNameMapper}).then(runtime => {
    const root = runtime.requireModule(runtime.__mockRootPath);
    root.jest.disableAutomock();
    const exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'ManuallyMocked',
    );
    expect(exports.isManualMockModule).toBe(false);
  }));

it('resolves mapped module names and unmocks them by default', () =>
  createRuntime(__filename, {
    moduleFileExtensions: ['js', 'jsx'],
    moduleNameMapper,
  }).then(runtime => {
    let exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'image!not_really_a_module',
    );
    expect(exports.isGlobalImageStub).toBe(true);

    exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'mappedToPath',
    );
    expect(exports.isGlobalImageStub).toBe(true);

    exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'mappedToModule',
    );
    expect(exports.moduleNameMapperResolutionWorks).toBe(true);

    exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'mappedToDirectory',
    );
    expect(exports.isIndex).toBe(true);

    exports = runtime.requireModuleOrMock(runtime.__mockRootPath, 'cat.png');
    expect(exports.isRelativeImageStub).toBe(true);

    exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      '../photos/dog.png',
    );
    expect(exports.isRelativeImageStub).toBe(true);

    exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'module/name/test',
    );
    expect(exports).toBe('mapped_module');

    exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'subdir1/style.css',
    );
    expect(exports.isManualMockModule).toBe(true);
  }));

it('automocking is disabled by default', () =>
  createRuntime(__filename, {
    moduleNameMapper,
  }).then(runtime => {
    const exports = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'RegularModule',
    );
    expect(exports.setModuleStateValue._isMockFunction).toBe(undefined);
  }));

it('unmocks modules in config.unmockedModulePathPatterns for tests with automock enabled when automock is false', () =>
  createRuntime(__filename, {
    automock: false,
    moduleNameMapper,
    unmockedModulePathPatterns: ['npm3-main-dep'],
  }).then(runtime => {
    const root = runtime.requireModule(runtime.__mockRootPath);
    root.jest.enableAutomock();
    const nodeModule = runtime.requireModuleOrMock(
      runtime.__mockRootPath,
      'npm3-main-dep',
    );
    const moduleData = nodeModule();
    expect(moduleData.isUnmocked()).toBe(true);
  }));

it('unmocks virtual mocks after they have been mocked previously', () =>
  createRuntime(__filename).then(runtime => {
    const root = runtime.requireModule(runtime.__mockRootPath);

    const mockImpl = {foo: 'bar'};
    root.jest.mock('my-virtual-module', () => mockImpl, {virtual: true});

    expect(
      runtime.requireModuleOrMock(runtime.__mockRootPath, 'my-virtual-module'),
    ).toEqual(mockImpl);

    root.jest.unmock('my-virtual-module');

    expect(() => {
      runtime.requireModuleOrMock(runtime.__mockRootPath, 'my-virtual-module');
    }).toThrowError(
      new Error("Cannot find module 'my-virtual-module' from 'root.js'"),
    );
  }));

describe('resetModules', () => {
  it('resets all the modules', () =>
    createRuntime(__filename, {
      moduleNameMapper,
    }).then(runtime => {
      let exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'ModuleWithState',
      );
      expect(exports.getState()).toBe(1);
      exports.increment();
      expect(exports.getState()).toBe(2);
      runtime.resetModules();
      exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'ModuleWithState',
      );
      expect(exports.getState()).toBe(1);
    }));
});

describe('isolateModules', () => {
  it('resets all modules after the block', () =>
    createRuntime(__filename, {
      moduleNameMapper,
    }).then(runtime => {
      let exports;
      runtime.isolateModules(() => {
        exports = runtime.requireModuleOrMock(
          runtime.__mockRootPath,
          'ModuleWithState',
        );
        expect(exports.getState()).toBe(1);
        exports.increment();
        expect(exports.getState()).toBe(2);
      });

      exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'ModuleWithState',
      );
      expect(exports.getState()).toBe(1);
    }));

  it('resets module after failing', () =>
    createRuntime(__filename, {
      moduleNameMapper,
    }).then(runtime => {
      expect(() =>
        runtime.isolateModules(() => {
          throw new Error('Error from isolated module');
        }),
      ).toThrowError('Error from isolated module');

      runtime.isolateModules(() => {
        expect(true).toBe(true);
      });
    }));

  it('isolates module after module has already been required', () =>
    createRuntime(__filename, {
      moduleNameMapper,
    }).then(runtime => {
      let exports;

      exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'ModuleWithState',
      );
      exports.increment();
      expect(exports.getState()).toBe(2);

      runtime.isolateModules(() => {
        exports = runtime.requireModuleOrMock(
          runtime.__mockRootPath,
          'ModuleWithState',
        );
        expect(exports.getState()).toBe(1);
      });
    }));

  it('can isolate the same module multiple times', () =>
    createRuntime(__filename, {
      moduleNameMapper,
    }).then(runtime => {
      runtime.isolateModules(() => {
        const exports = runtime.requireModuleOrMock(
          runtime.__mockRootPath,
          'ModuleWithState',
        );
        exports.increment();
        expect(exports.getState()).toBe(2);
      });

      runtime.isolateModules(() => {
        const exports = runtime.requireModuleOrMock(
          runtime.__mockRootPath,
          'ModuleWithState',
        );
        expect(exports.getState()).toBe(1);
      });
    }));

  it("doesn't isolate higher dependencies within the isolated module", () =>
    createRuntime(__filename, {
      moduleNameMapper,
    }).then(runtime => {
      const exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'ModuleWithStatefulImport',
      );
      exports.increment();
      expect(exports.getState()).toBe(2);

      let isolatedExports;
      runtime.isolateModules(
        () =>
          (isolatedExports = runtime.requireModuleOrMock(
            runtime.__mockRootPath,
            'ModuleWithStatefulImport',
          )),
      );

      // Higher dependency's state is unaffected
      expect(exports.getState()).toBe(isolatedExports.getState());
      // Internal object within isolated module becomes a copy
      expect(exports.scopedObject).toEqual(isolatedExports.scopedObject);
      expect(exports.scopedObject).not.toBe(isolatedExports.scopedObject);
    }));

  it('can isolate mocks', () =>
    createRuntime(__filename, {
      moduleNameMapper,
    }).then(runtime => {
      runtime.setMock(runtime.__mockRootPath, 'ModuleWithState', () => {
        let state = 50;
        return {
          getState: () => state,
          increment: () => state++,
        };
      });

      const exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'ModuleWithStatefulImport',
      );
      exports.increment();
      expect(exports.getState()).toBe(51);

      runtime.isolateModules(() => {
        const isolatedMock = runtime.requireMock(
          runtime.__mockRootPath,
          'ModuleWithState',
        );
        expect(isolatedMock.getState()).toBe(50);
      });
    }));

  it('cannot nest isolateModules blocks', () =>
    createRuntime(__filename, {
      moduleNameMapper,
    }).then(runtime => {
      expect(() => {
        runtime.isolateModules(() => {
          runtime.isolateModules(() => {});
        });
      }).toThrowError(
        'isolateModules cannot be nested inside another isolateModules.',
      );
    }));

  it('can call resetModules within a isolateModules block', () =>
    createRuntime(__filename, {
      moduleNameMapper,
    }).then(runtime => {
      let exports;
      runtime.isolateModules(() => {
        exports = runtime.requireModuleOrMock(
          runtime.__mockRootPath,
          'ModuleWithState',
        );
        expect(exports.getState()).toBe(1);

        exports.increment();
        runtime.resetModules();

        exports = runtime.requireModuleOrMock(
          runtime.__mockRootPath,
          'ModuleWithState',
        );
        expect(exports.getState()).toBe(1);
      });

      exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'ModuleWithState',
      );
      expect(exports.getState()).toBe(1);
    }));

  describe('can use isolateModules from a beforeEach block', () => {
    let exports;
    beforeEach(() => {
      jest.isolateModules(() => {
        exports = require('./test_root/ModuleWithState');
      });
    });

    it('can use the required module from beforeEach and re-require it', () => {
      expect(exports.getState()).toBe(1);
      exports.increment();
      expect(exports.getState()).toBe(2);

      exports = require('./test_root/ModuleWithState');
      expect(exports.getState()).toBe(1);
      exports.increment();
      expect(exports.getState()).toBe(2);
    });
  });
});
