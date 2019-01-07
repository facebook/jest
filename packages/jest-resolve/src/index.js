/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path} from 'types/Config';
import type {ModuleMap} from 'types/HasteMap';
import type {ResolveModuleConfig} from 'types/Resolve';
import type {ErrorWithCode} from 'types/Errors';

import fs from 'fs';
import path from 'path';
import {interopRequireDefault} from 'jest-util';
import nodeModulesPaths from './nodeModulesPaths';
import isBuiltinModule from './isBuiltinModule';
import defaultResolver from './defaultResolver';
import chalk from 'chalk';

type ResolverConfig = {|
  browser?: boolean,
  defaultPlatform: ?string,
  extensions: Array<string>,
  hasCoreModules: boolean,
  moduleDirectories: Array<string>,
  moduleNameMapper: ?Array<ModuleNameMapperConfig>,
  modulePaths: Array<Path>,
  platforms?: Array<string>,
  preserveSymlinks?: boolean,
  resolver: ?Path,
  rootDir: ?Path,
|};

type FindNodeModuleConfig = {|
  basedir: Path,
  browser?: boolean,
  extensions?: Array<string>,
  moduleDirectory?: Array<string>,
  paths?: Array<Path>,
  preserveSymlinks?: boolean,
  resolver?: ?Path,
  rootDir?: ?Path,
|};

type ModuleNameMapperConfig = {|
  regex: RegExp,
  moduleName: string,
|};

type BooleanObject = {[key: string]: boolean, __proto__: null};

const NATIVE_PLATFORM = 'native';

// We might be inside a symlink.
const cwd = process.cwd();
const resolvedCwd = fs.realpathSync(cwd) || cwd;
const nodePaths = process.env.NODE_PATH
  ? process.env.NODE_PATH.split(path.delimiter)
      .filter(Boolean)
      // The resolver expects absolute paths.
      .map(p => path.resolve(resolvedCwd, p))
  : null;

export default class Resolver {
  _options: ResolverConfig;
  _moduleMap: ModuleMap;
  _moduleIDCache: {[key: string]: string, __proto__: null};
  _moduleNameCache: {[name: string]: Path, __proto__: null};
  _modulePathCache: {[path: Path]: Array<Path>, __proto__: null};
  _supportsNativePlatform: boolean;

  constructor(moduleMap: ModuleMap, options: ResolverConfig) {
    this._options = {
      browser: options.browser,
      defaultPlatform: options.defaultPlatform,
      extensions: options.extensions,
      hasCoreModules:
        options.hasCoreModules === undefined ? true : options.hasCoreModules,
      moduleDirectories: options.moduleDirectories || ['node_modules'],
      moduleNameMapper: options.moduleNameMapper,
      modulePaths: options.modulePaths,
      platforms: options.platforms,
      preserveSymlinks: options.preserveSymlinks,
      resolver: options.resolver,
      rootDir: options.rootDir,
    };
    this._supportsNativePlatform = options.platforms
      ? options.platforms.includes(NATIVE_PLATFORM)
      : false;
    this._moduleMap = moduleMap;
    this._moduleIDCache = Object.create(null);
    this._moduleNameCache = Object.create(null);
    this._modulePathCache = Object.create(null);
  }

  static findNodeModule(path: Path, options: FindNodeModuleConfig): ?Path {
    const resolver = options.resolver
      ? interopRequireDefault(
          // $FlowFixMe
          require(options.resolver),
        ).default
      : defaultResolver;
    const paths = options.paths;

    try {
      return resolver(path, {
        basedir: options.basedir,
        browser: options.browser,
        extensions: options.extensions,
        moduleDirectory: options.moduleDirectory,
        paths: paths ? (nodePaths || []).concat(paths) : nodePaths,
        preserveSymlinks: options.preserveSymlinks,
        rootDir: options.rootDir,
      });
    } catch (e) {}
    return null;
  }

  resolveModuleFromDirIfExists(
    dirname: Path,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): ?Path {
    const paths = (options && options.paths) || this._options.modulePaths;
    const moduleDirectory = this._options.moduleDirectories;
    const key = dirname + path.delimiter + moduleName;
    const defaultPlatform = this._options.defaultPlatform;
    const extensions = this._options.extensions.slice();
    if (this._supportsNativePlatform) {
      extensions.unshift(
        ...this._options.extensions.map(ext => '.' + NATIVE_PLATFORM + ext),
      );
    }
    if (defaultPlatform) {
      extensions.unshift(
        ...this._options.extensions.map(ext => '.' + defaultPlatform + ext),
      );
    }

    // 0. If we have already resolved this module for this directory name,
    //    return a value from the cache.
    if (this._moduleNameCache[key]) {
      return this._moduleNameCache[key];
    }

    // 1. Check if the module is a haste module.
    let module = this.getModule(moduleName);
    if (module) {
      return (this._moduleNameCache[key] = module);
    }

    // 2. Check if the module is a node module and resolve it based on
    //    the node module resolution algorithm.
    // If skipNodeResolution is given we ignore all modules that look like
    // node modules (ie. are not relative requires). This enables us to speed
    // up resolution when we build a dependency graph because we don't have
    // to look at modules that may not exist and aren't mocked.
    const skipResolution =
      options && options.skipNodeResolution && !moduleName.includes(path.sep);

    const resolveNodeModule = name =>
      Resolver.findNodeModule(name, {
        basedir: dirname,
        browser: this._options.browser,
        extensions,
        moduleDirectory,
        paths,
        preserveSymlinks: this._options.preserveSymlinks,
        resolver: this._options.resolver,
        rootDir: this._options.rootDir,
      });

    if (!skipResolution) {
      module = resolveNodeModule(moduleName);

      if (module) {
        return (this._moduleNameCache[key] = module);
      }
    }

    // 3. Resolve "haste packages" which are `package.json` files outside of
    // `node_modules` folders anywhere in the file system.
    const parts = moduleName.split('/');
    const hastePackage = this.getPackage(parts.shift());
    if (hastePackage) {
      try {
        const module = path.join.apply(
          path,
          [path.dirname(hastePackage)].concat(parts),
        );
        // try resolving with custom resolver first to support extensions,
        // then fallback to require.resolve
        return (this._moduleNameCache[key] =
          resolveNodeModule(module) || require.resolve(module));
      } catch (ignoredError) {}
    }

    return null;
  }

  resolveModule(
    from: Path,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): Path {
    const dirname = path.dirname(from);
    const module = this.resolveModuleFromDirIfExists(
      dirname,
      moduleName,
      options,
    );
    if (module) return module;

    // (4.) Throw an error if the module could not be found. `resolve.sync`
    //      only produces an error based on the dirname but we have the actual
    //      current module name available.
    const relativePath = path.relative(dirname, from);
    const err = new Error(
      `Cannot find module '${moduleName}' from '${relativePath || '.'}'`,
    );
    (err: ErrorWithCode).code = 'MODULE_NOT_FOUND';
    throw err;
  }

  isCoreModule(moduleName: string): boolean {
    return this._options.hasCoreModules && isBuiltinModule(moduleName);
  }

  getModule(name: string): ?Path {
    return this._moduleMap.getModule(
      name,
      this._options.defaultPlatform,
      this._supportsNativePlatform,
    );
  }

  getModulePath(from: Path, moduleName: string) {
    if (moduleName[0] !== '.' || path.isAbsolute(moduleName)) {
      return moduleName;
    }
    return path.normalize(path.dirname(from) + '/' + moduleName);
  }

  getPackage(name: string): ?Path {
    return this._moduleMap.getPackage(
      name,
      this._options.defaultPlatform,
      this._supportsNativePlatform,
    );
  }

  getMockModule(from: Path, name: string): ?Path {
    const mock = this._moduleMap.getMockModule(name);
    if (mock) {
      return mock;
    } else {
      const moduleName = this._resolveStubModuleName(from, name);
      if (moduleName) {
        return this.getModule(moduleName) || moduleName;
      }
    }
    return null;
  }

  getModulePaths(from: Path): Array<Path> {
    if (!this._modulePathCache[from]) {
      const moduleDirectory = this._options.moduleDirectories;
      const paths = nodeModulesPaths(from, {moduleDirectory});
      if (paths[paths.length - 1] === undefined) {
        // circumvent node-resolve bug that adds `undefined` as last item.
        paths.pop();
      }
      this._modulePathCache[from] = paths;
    }
    return this._modulePathCache[from];
  }

  getModuleID(
    virtualMocks: BooleanObject,
    from: Path,
    _moduleName?: ?string,
  ): string {
    const moduleName = _moduleName || '';

    const key = from + path.delimiter + moduleName;
    if (this._moduleIDCache[key]) {
      return this._moduleIDCache[key];
    }

    const moduleType = this._getModuleType(moduleName);
    const absolutePath = this._getAbsolutePath(virtualMocks, from, moduleName);
    const mockPath = this._getMockPath(from, moduleName);

    const sep = path.delimiter;
    const id =
      moduleType +
      sep +
      (absolutePath ? absolutePath + sep : '') +
      (mockPath ? mockPath + sep : '');

    return (this._moduleIDCache[key] = id);
  }

  _getModuleType(moduleName: string): 'node' | 'user' {
    return this.isCoreModule(moduleName) ? 'node' : 'user';
  }

  _getAbsolutePath(
    virtualMocks: BooleanObject,
    from: Path,
    moduleName: string,
  ): ?string {
    if (this.isCoreModule(moduleName)) {
      return moduleName;
    }
    return this._isModuleResolved(from, moduleName)
      ? this.getModule(moduleName)
      : this._getVirtualMockPath(virtualMocks, from, moduleName);
  }

  _getMockPath(from: Path, moduleName: string): ?string {
    return !this.isCoreModule(moduleName)
      ? this.getMockModule(from, moduleName)
      : null;
  }

  _getVirtualMockPath(
    virtualMocks: BooleanObject,
    from: Path,
    moduleName: string,
  ): Path {
    const virtualMockPath = this.getModulePath(from, moduleName);
    return virtualMocks[virtualMockPath]
      ? virtualMockPath
      : moduleName
      ? this.resolveModule(from, moduleName)
      : from;
  }

  _isModuleResolved(from: Path, moduleName: string): boolean {
    return !!(
      this.getModule(moduleName) || this.getMockModule(from, moduleName)
    );
  }

  _resolveStubModuleName(from: Path, moduleName: string): ?Path {
    const dirname = path.dirname(from);
    const paths = this._options.modulePaths;
    const extensions = this._options.extensions.slice();
    const moduleDirectory = this._options.moduleDirectories;
    const moduleNameMapper = this._options.moduleNameMapper;
    const resolver = this._options.resolver;
    const defaultPlatform = this._options.defaultPlatform;

    if (this._supportsNativePlatform) {
      extensions.unshift(
        ...this._options.extensions.map(ext => '.' + NATIVE_PLATFORM + ext),
      );
    }

    if (defaultPlatform) {
      extensions.unshift(
        ...this._options.extensions.map(ext => '.' + defaultPlatform + ext),
      );
    }

    if (moduleNameMapper) {
      for (const {moduleName: mappedModuleName, regex} of moduleNameMapper) {
        if (regex.test(moduleName)) {
          // Note: once a moduleNameMapper matches the name, it must result
          // in a module, or else an error is thrown.
          const matches = moduleName.match(regex);
          const updatedName = matches
            ? mappedModuleName.replace(
                /\$([0-9]+)/g,
                (_, index) => matches[parseInt(index, 10)],
              )
            : mappedModuleName;

          const module =
            this.getModule(updatedName) ||
            Resolver.findNodeModule(updatedName, {
              basedir: dirname,
              browser: this._options.browser,
              extensions,
              moduleDirectory,
              paths,
              preserveSymlinks: this._options.preserveSymlinks,
              resolver,
              rootDir: this._options.rootDir,
            });
          if (!module) {
            throw createNoMappedModuleFoundError(
              moduleName,
              updatedName,
              mappedModuleName,
              regex,
              resolver,
            );
          }
          return module;
        }
      }
    }
    return null;
  }
}

const createNoMappedModuleFoundError = (
  moduleName,
  updatedName,
  mappedModuleName,
  regex,
  resolver,
) => {
  const error = new Error(
    chalk.red(`${chalk.bold('Configuration error')}:

Could not locate module ${chalk.bold(moduleName)} mapped as:
${chalk.bold(updatedName)}.

Please check your configuration for these entries:
{
  "moduleNameMapper": {
    "${regex.toString()}": "${chalk.bold(mappedModuleName)}"
  },
  "resolver": ${chalk.bold(String(resolver))}
}`),
  );

  error.name = '';

  return error;
};
