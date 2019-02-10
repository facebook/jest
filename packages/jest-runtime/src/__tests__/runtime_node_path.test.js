/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const path = require('path');

const cwd = process.cwd();

let createLocalRuntime;

describe('Runtime', () => {
  beforeEach(() => {
    jest.resetModules();

    createLocalRuntime = (nodePath, config) => {
      process.env.NODE_PATH = nodePath;
      const createRuntime = require('createRuntime');
      return createRuntime(__filename, config);
    };
  });

  it('uses NODE_PATH to find modules', () => {
    const nodePath = __dirname + '/NODE_PATH_dir';
    return createLocalRuntime(nodePath).then(runtime => {
      const exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'regular_module_in_node_path',
      );
      expect(exports).toBeDefined();
    });
  });

  it('uses modulePaths to find modules', () => {
    const nodePath = __dirname + '/NODE_PATH_dir';
    return createLocalRuntime(null, {modulePaths: [nodePath]}).then(runtime => {
      const exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'regular_module_in_node_path',
      );
      expect(exports).toBeDefined();
    });
  });

  it('finds modules in NODE_PATH containing multiple paths', () => {
    const nodePath =
      cwd + '/some/other/path' + path.delimiter + __dirname + '/NODE_PATH_dir';
    return createLocalRuntime(nodePath).then(runtime => {
      const exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'regular_module_in_node_path',
      );
      expect(exports).toBeDefined();
    });
  });

  it('does not find modules if NODE_PATH is relative', () => {
    const nodePath =
      cwd.substr(path.sep.length) + 'src/Runtime/__tests__/NODE_PATH_dir';
    return createLocalRuntime(nodePath).then(runtime => {
      expect(() => {
        runtime.requireModuleOrMock(
          runtime.__mockRootPath,
          'regular_module_in_node_path',
        );
      }).toThrow(
        new Error(
          `Cannot find module 'regular_module_in_node_path' from 'root.js'`,
        ),
      );
    });
  });
});
