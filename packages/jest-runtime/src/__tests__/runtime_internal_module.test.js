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

describe('Runtime', () => {
  beforeEach(() => {
    jest.resetModules();

    createRuntime = require('createRuntime');
  });

  describe('internalModule', () => {
    it('loads modules and applies transforms', () =>
      createRuntime(__filename, {
        transform: {'^.+\\.js$': './test_preprocessor'},
      }).then(runtime => {
        const modulePath = path.resolve(
          path.dirname(runtime.__mockRootPath),
          'internal-root.js',
        );
        expect(() => {
          runtime.requireModule(modulePath);
        }).toThrow(new Error('preprocessor must not run.'));
      }));

    it('loads internal modules without applying transforms', () =>
      createRuntime(__filename, {
        transform: {'^.+\\.js$': './test_preprocessor'},
      }).then(runtime => {
        const modulePath = path.resolve(
          path.dirname(runtime.__mockRootPath),
          'internal-root.js',
        );
        const exports = runtime.requireInternalModule(modulePath);
        expect(exports()).toBe('internal-module-data');
      }));
  });
});
