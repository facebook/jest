/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Module} from 'module';
import path from 'path';
import * as fs from 'graceful-fs';

let createRuntime;

describe('Runtime requireModule', () => {
  beforeEach(() => {
    createRuntime = require('createRuntime');
  });

  it('overrides `Module#compile`', () =>
    createRuntime(__filename).then(runtime => {
      const exports = runtime.requireModule(runtime.__mockRootPath, 'module');
      expect(exports.Module).not.toBe(Module);

      const mockFilename = name =>
        path.join(path.dirname(runtime.__mockRootPath), name);

      {
        const pathRegularModule = mockFilename('RegularModule.js');
        const source = fs.readFileSync(pathRegularModule, 'utf-8');

        const module = new exports.Module();
        module._compile(source, pathRegularModule);
        expect(module).toMatchObject({
          children: expect.anything(),
          exports: expect.anything(),
          filename: null,
          loaded: false,
          parent: null,
          paths: expect.anything(),
        });
        // This is undefined in Node 10 and '' in Node 14 by default.
        expect(module.id).toBeFalsy();
        expect(Object.keys(module.exports)).toEqual([
          'filename',
          'getModuleStateValue',
          'isRealModule',
          'jest',
          'lazyRequire',
          'object',
          'parent',
          'paths',
          'setModuleStateValue',
          'module',
          'loaded',
          'isLoaded',
        ]);

        expect(module.exports.getModuleStateValue()).toBe('default');

        module.exports.lazyRequire();

        // The dynamically compiled module should not be added to the registry,
        // so no side effects should occur.
        expect(module.exports.getModuleStateValue()).toBe('default');
      }

      {
        const module = new exports.Module();
        module._compile('exports.value = 12;', mockFilename('dynamic.js'));
        expect(module.exports).toEqual({value: 12});
      }

      expect(() =>
        module._compile('{"value":12}', mockFilename('dynamic.json')),
      ).toThrow(expect.objectContaining({name: 'SyntaxError'}));

      {
        const module = new exports.Module();
        module._compile(
          'exports.windowType = typeof window;',
          mockFilename('example.js'),
        );
        expect(module.exports).toEqual({windowType: 'undefined'});
      }
    }));

  it('provides the appropriate environment', () =>
    createRuntime(
      __filename,
      {},
      {
        EnvironmentImpl: require('../../../jest-environment-jsdom/src'),
      },
    ).then(runtime => {
      const exports = runtime.requireModule(runtime.__mockRootPath, 'module');

      const mockFilename = name =>
        path.join(path.dirname(runtime.__mockRootPath), name);

      {
        const module = new exports.Module();
        module._compile(
          'exports.hasWindow = !!window;',
          mockFilename('example.js'),
        );
        expect(module.exports).toEqual({hasWindow: true});
      }
    }));
});
