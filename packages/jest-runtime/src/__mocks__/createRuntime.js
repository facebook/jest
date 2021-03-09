/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import path from 'path';
import {makeProjectConfig} from '@jest/test-utils';
import {createScriptTransformer} from '@jest/transform';
import NodeEnvironment from 'jest-environment-node';
import {tryRealpath} from 'jest-util';
import Runtime from '../';

// Copy from jest-config (since we don't want to depend on this package)
const getCacheDirectory = () => {
  const {getuid} = process;
  const tmpdirPath = path.join(tryRealpath(tmpdir()), 'jest');
  if (getuid == null) {
    return tmpdirPath;
  } else {
    // On some platforms tmpdir() is `/tmp`, causing conflicts between different
    // users and permission issues. Adding an additional subdivision by UID can
    // help.
    return `${tmpdirPath}_${getuid.call(process).toString(36)}`;
  }
};

const setupModuleNameMapper = (config, rootDir) => {
  if (config && config.moduleNameMapper) {
    return Object.keys(config.moduleNameMapper).map(regex => {
      const item = config.moduleNameMapper && config.moduleNameMapper[regex];
      return item && [regex, item.replace('<rootDir>', rootDir)];
    });
  }
  return [];
};

const setupTransform = (config, rootDir) => {
  if (config?.transform) {
    const transform = config.transform;
    return Object.keys(transform).map(regex => [
      regex,
      path.resolve(rootDir, transform[regex]),
    ]);
  }
  return [['^.+\\.[jt]sx?$', require.resolve('babel-jest')]];
};

module.exports = async function createRuntime(filename, config) {
  const rootDir = path.resolve(path.dirname(filename), 'test_root');

  const moduleNameMapper = setupModuleNameMapper(config, rootDir);
  const transform = setupTransform(config, rootDir);

  config = makeProjectConfig({
    cacheDirectory: getCacheDirectory(),
    cwd: path.resolve(__dirname, '..', '..', '..', '..'),
    haste: {
      hasteImplModulePath: path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'jest-haste-map',
        'src',
        '__tests__',
        'haste_impl.js',
      ),
    },
    id: 'Runtime-' + filename.replace(/\W/, '-') + '.tests',
    moduleDirectories: ['node_modules'],
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
    rootDir,
    ...config,
    moduleNameMapper,
    transform,
  });

  if (!config.roots.length) {
    config.roots = [config.rootDir];
  }

  const environment = new NodeEnvironment(config);
  environment.global.console = console;

  const hasteMap = await Runtime.createHasteMap(config, {
    maxWorkers: 1,
    resetCache: false,
  }).build();

  const cacheFS = new Map();
  const scriptTransformer = await createScriptTransformer(config, cacheFS);

  const runtime = new Runtime(
    config,
    environment,
    Runtime.createResolver(config, hasteMap.moduleMap),
    scriptTransformer,
    cacheFS,
    {
      changedFiles: undefined,
      collectCoverage: false,
      collectCoverageFrom: [],
      collectCoverageOnlyFrom: undefined,
      coverageProvider: 'v8',
      sourcesRelatedToTestsInChangedFiles: undefined,
    },
    filename,
  );

  for (const path of config.setupFiles) {
    const esm = runtime.unstable_shouldLoadAsEsm(path);

    if (esm) {
      await runtime.unstable_importModule(path);
    } else {
      runtime.requireModule(path);
    }
  }

  runtime.__mockRootPath = path.join(config.rootDir, 'root.js');
  runtime.__mockSubdirPath = path.join(
    config.rootDir,
    'subdir2',
    'module_dir',
    'module_dir_module.js',
  );
  return runtime;
};
