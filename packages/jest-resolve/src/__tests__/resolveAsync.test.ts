/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as path from 'path';
import * as fs from 'graceful-fs';
import {sync as resolveSync} from 'resolve';
import {ModuleMap} from 'jest-haste-map';
import userResolverAsync from '../__mocks__/userResolverAsync';
import defaultResolver from '../defaultResolver';
import nodeModulesPaths from '../nodeModulesPaths';
import {ResolverAsync} from '../resolver';
import type {ResolverConfig} from '../types';

jest.mock('../__mocks__/userResolverAsync');

// Do not fully mock `resolve` because it is used by Jest. Doing it will crash
// in very strange ways. Instead just spy on the method `sync`.
jest.mock('resolve', () => {
  const originalModule = jest.requireActual('resolve');
  return {
    ...originalModule,
    sync: jest.spyOn(originalModule, 'sync'),
  };
});

const mockResolveSync = <
  jest.Mock<ReturnType<typeof resolveSync>, Parameters<typeof resolveSync>>
>resolveSync;

beforeEach(() => {
  userResolverAsync.mockClear();
  mockResolveSync.mockClear();
});

describe('isCoreModule', () => {
  it('returns false if `hasCoreModules` is false.', () => {
    const moduleMap = ModuleMap.create('/');
    const resolver = new ResolverAsync(moduleMap, {
      hasCoreModules: false,
    } as ResolverConfig);
    const isCore = resolver.isCoreModule('assert');
    expect(isCore).toEqual(false);
  });

  it('returns true if `hasCoreModules` is true and `moduleName` is a core module.', () => {
    const moduleMap = ModuleMap.create('/');
    const resolver = new ResolverAsync(moduleMap, {} as ResolverConfig);
    const isCore = resolver.isCoreModule('assert');
    expect(isCore).toEqual(true);
  });

  it('returns false if `hasCoreModules` is true and `moduleName` is not a core module.', () => {
    const moduleMap = ModuleMap.create('/');
    const resolver = new ResolverAsync(moduleMap, {} as ResolverConfig);
    const isCore = resolver.isCoreModule('not-a-core-module');
    expect(isCore).toEqual(false);
  });

  it('returns false if `hasCoreModules` is true and `moduleNameMapper` alias a module same name with core module', () => {
    const moduleMap = ModuleMap.create('/');
    const resolver = new ResolverAsync(moduleMap, {
      moduleNameMapper: [
        {
          moduleName: '$1',
          regex: /^constants$/,
        },
      ],
    } as ResolverConfig);
    const isCore = resolver.isCoreModule('constants');
    expect(isCore).toEqual(false);
  });
});

describe('findNodeModuleAsync', () => {
  it('is possible to override the default resolver', async () => {
    const cwd = process.cwd();
    const resolvedCwd = fs.realpathSync(cwd) || cwd;
    const nodePaths = process.env.NODE_PATH
      ? process.env.NODE_PATH.split(path.delimiter)
          .filter(Boolean)
          .map(p => path.resolve(resolvedCwd, p))
      : null;

    userResolverAsync.mockImplementation(() => Promise.resolve('module'));

    const newPath = await ResolverAsync.findNodeModuleAsync('test', {
      basedir: '/',
      browser: true,
      extensions: ['js'],
      moduleDirectory: ['node_modules'],
      paths: ['/something'],
      asyncResolver: require.resolve('../__mocks__/userResolverAsync'),
    });

    expect(newPath).toBe('module');
    expect(userResolverAsync.mock.calls[0][0]).toBe('test');
    expect(userResolverAsync.mock.calls[0][1]).toStrictEqual({
      basedir: '/',
      browser: true,
      defaultResolver,
      extensions: ['js'],
      moduleDirectory: ['node_modules'],
      paths: (nodePaths || []).concat(['/something']),
      rootDir: undefined,
    });
  });

  it('passes packageFilter to the resolve module when using the default resolver', async () => {
    const packageFilter = jest.fn();

    // A resolver that delegates to defaultResolver with a packageFilter implementation
    userResolverAsync.mockImplementation((request, opts) =>
      Promise.resolve(opts.defaultResolver(request, {...opts, packageFilter})),
    );

    await ResolverAsync.findNodeModuleAsync('test', {
      basedir: '/',
      asyncResolver: require.resolve('../__mocks__/userResolverAsync'),
    });

    expect(mockResolveSync).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        packageFilter,
      }),
    );
  });
});

describe('resolveModuleAsync', () => {
  let moduleMap: ModuleMap;
  beforeEach(() => {
    moduleMap = ModuleMap.create('/');
  });

  it('is possible to resolve node modules', async () => {
    const resolver = new ResolverAsync(moduleMap, {
      extensions: ['.js'],
    } as ResolverConfig);
    const src = require.resolve('../');
    const resolved = await resolver.resolveModuleAsync(
      src,
      './__mocks__/mockJsDependency',
    );
    expect(resolved).toBe(require.resolve('../__mocks__/mockJsDependency.js'));
  });

  it('is possible to resolve node modules with custom extensions', async () => {
    const resolver = new ResolverAsync(moduleMap, {
      extensions: ['.js', '.jsx'],
    } as ResolverConfig);
    const src = require.resolve('../');
    const resolvedJsx = await resolver.resolveModuleAsync(
      src,
      './__mocks__/mockJsxDependency',
    );
    expect(resolvedJsx).toBe(
      require.resolve('../__mocks__/mockJsxDependency.jsx'),
    );
  });

  it('is possible to resolve node modules with custom extensions and platforms', async () => {
    const resolver = new ResolverAsync(moduleMap, {
      extensions: ['.js', '.jsx'],
      platforms: ['native'],
    } as ResolverConfig);
    const src = require.resolve('../');
    const resolvedJsx = await resolver.resolveModuleAsync(
      src,
      './__mocks__/mockJsxDependency',
    );
    expect(resolvedJsx).toBe(
      require.resolve('../__mocks__/mockJsxDependency.native.jsx'),
    );
  });

  it('is possible to resolve node modules by resolving their realpath', async () => {
    const resolver = new ResolverAsync(moduleMap, {
      extensions: ['.js'],
    } as ResolverConfig);
    const src = path.join(
      path.resolve(__dirname, '../../src/__mocks__/bar/node_modules/'),
      'foo/index.js',
    );
    const resolved = await resolver.resolveModuleAsync(src, 'dep');
    expect(resolved).toBe(
      require.resolve('../../src/__mocks__/foo/node_modules/dep/index.js'),
    );
  });

  it('is possible to specify custom resolve paths', async () => {
    const resolver = new ResolverAsync(moduleMap, {
      extensions: ['.js'],
    } as ResolverConfig);
    const src = require.resolve('../');
    const resolved = await resolver.resolveModuleAsync(
      src,
      'mockJsDependency',
      {
        paths: [
          path.resolve(__dirname, '../../src/__tests__'),
          path.resolve(__dirname, '../../src/__mocks__'),
        ],
      },
    );
    expect(resolved).toBe(require.resolve('../__mocks__/mockJsDependency.js'));
  });

  it('does not confuse directories with files', async () => {
    const resolver = new ResolverAsync(moduleMap, {
      extensions: ['.js'],
    } as ResolverConfig);
    const mocksDirectory = path.resolve(__dirname, '../__mocks__');
    const fooSlashFoo = path.join(mocksDirectory, 'foo/foo.js');
    const fooSlashIndex = path.join(mocksDirectory, 'foo/index.js');

    const resolvedWithSlash = await resolver.resolveModuleAsync(
      fooSlashFoo,
      './',
    );
    const resolvedWithDot = await resolver.resolveModuleAsync(fooSlashFoo, '.');
    expect(resolvedWithSlash).toBe(fooSlashIndex);
    expect(resolvedWithSlash).toBe(resolvedWithDot);
  });
});

describe('getMockModuleAsync', () => {
  it.only('is possible to use custom resolver to resolve deps inside mock modules with moduleNameMapper', async () => {
    userResolverAsync.mockImplementation(() => Promise.resolve('module'));

    const moduleMap = ModuleMap.create('/');
    const resolver = new ResolverAsync(moduleMap, {
      extensions: ['.js'],
      moduleNameMapper: [
        {
          moduleName: '$1',
          regex: /(.*)/,
        },
      ],
      asyncResolver: require.resolve('../__mocks__/userResolverAsync'),
    } as ResolverConfig);
    const src = require.resolve('../');

    await resolver.resolveModuleAsync(src, 'dependentModule');

    expect(userResolverAsync).toHaveBeenCalled();
    expect(userResolverAsync.mock.calls[0][0]).toBe('dependentModule');
    expect(userResolverAsync.mock.calls[0][1]).toHaveProperty(
      'basedir',
      path.dirname(src),
    );
  });
});

describe('nodeModulesPaths', () => {
  it('provides custom module paths after node_modules', () => {
    const src = require.resolve('../');
    const result = nodeModulesPaths(src, {paths: ['./customFolder']});
    expect(result[result.length - 1]).toBe('./customFolder');
  });
});

describe('Resolver.getModulePaths() -> nodeModulesPaths()', () => {
  const _path = path;
  let moduleMap: ModuleMap;

  beforeEach(() => {
    jest.resetModules();

    moduleMap = ModuleMap.create('/');

    // Mocking realpath to function the old way, where it just looks at
    // pathstrings instead of actually trying to access the physical directory.
    // This test suite won't work otherwise, since we cannot make assumptions
    // about the test environment when it comes to absolute paths.
    jest.doMock('graceful-fs', () => ({
      ...jest.requireActual('graceful-fs'),
      realPathSync: {
        native: (dirInput: string) => dirInput,
      },
    }));
  });

  afterAll(() => {
    jest.resetModules();
    jest.dontMock('path');
  });

  it('can resolve node modules relative to absolute paths in "moduleDirectories" on Windows platforms', () => {
    jest.doMock('path', () => _path.win32);
    const path = require('path');
    const Resolver = require('../').default;

    const cwd = 'D:\\temp\\project';
    const src = 'C:\\path\\to\\node_modules';
    const resolver = new Resolver(moduleMap, {
      moduleDirectories: [src, 'node_modules'],
    });
    const dirs_expected = [
      src,
      cwd + '\\node_modules',
      path.dirname(cwd) + '\\node_modules',
      'D:\\node_modules',
    ];
    const dirs_actual = resolver.getModulePaths(cwd);
    expect(dirs_actual).toEqual(expect.arrayContaining(dirs_expected));
  });

  it('can resolve node modules relative to absolute paths in "moduleDirectories" on Posix platforms', () => {
    jest.doMock('path', () => _path.posix);
    const path = require('path');
    const Resolver = require('../').default;

    const cwd = '/temp/project';
    const src = '/path/to/node_modules';
    const resolver = new Resolver(moduleMap, {
      moduleDirectories: [src, 'node_modules'],
    });
    const dirs_expected = [
      src,
      cwd + '/node_modules',
      path.dirname(cwd) + '/node_modules',
      '/node_modules',
    ];
    const dirs_actual = resolver.getModulePaths(cwd);
    expect(dirs_actual).toEqual(expect.arrayContaining(dirs_expected));
  });
});
