/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/prefer-spread-eventually */

import * as path from 'path';
import chalk = require('chalk');
import slash = require('slash');
import type {Config} from '@jest/types';
import type {IModuleMap} from 'jest-haste-map';
import {tryRealpath} from 'jest-util';
import ModuleNotFoundError from './ModuleNotFoundError';
import defaultResolver, {
  clearDefaultResolverCache,
  defaultResolverAsync,
} from './defaultResolver';
import isBuiltinModule from './isBuiltinModule';
import nodeModulesPaths from './nodeModulesPaths';
import shouldLoadAsEsm, {clearCachedLookups} from './shouldLoadAsEsm';
import type {ResolverConfig} from './types';

type FindNodeModuleConfig = {
  basedir: Config.Path;
  browser?: boolean;
  extensions?: Array<string>;
  moduleDirectory?: Array<string>;
  paths?: Array<Config.Path>;
  resolver?: Config.Path | null;
  asyncResolver?: Config.Path | null;
  rootDir?: Config.Path;
  throwIfNotFound?: boolean;
};

export type ResolveModuleConfig = {
  skipNodeResolution?: boolean;
  paths?: Array<Config.Path>;
};

const NATIVE_PLATFORM = 'native';

// We might be inside a symlink.
const resolvedCwd = tryRealpath(process.cwd());
const {NODE_PATH} = process.env;
const nodePaths = NODE_PATH
  ? NODE_PATH.split(path.delimiter)
      .filter(Boolean)
      // The resolver expects absolute paths.
      .map(p => path.resolve(resolvedCwd, p))
  : undefined;

class BaseResolver {
  protected readonly _options: ResolverConfig;
  protected readonly _moduleMap: IModuleMap;
  protected readonly _moduleIDCache: Map<string, string>;
  protected readonly _moduleNameCache: Map<string, Config.Path>;
  private readonly _modulePathCache: Map<string, Array<Config.Path>>;
  private readonly _supportsNativePlatform: boolean;

  constructor(moduleMap: IModuleMap, options: ResolverConfig) {
    this._options = {
      defaultPlatform: options.defaultPlatform,
      extensions: options.extensions,
      hasCoreModules:
        options.hasCoreModules === undefined ? true : options.hasCoreModules,
      moduleDirectories: options.moduleDirectories || ['node_modules'],
      moduleNameMapper: options.moduleNameMapper,
      modulePaths: options.modulePaths,
      platforms: options.platforms,
      rootDir: options.rootDir,
    };
    this._supportsNativePlatform = options.platforms
      ? options.platforms.includes(NATIVE_PLATFORM)
      : false;
    this._moduleMap = moduleMap;
    this._moduleIDCache = new Map();
    this._moduleNameCache = new Map();
    this._modulePathCache = new Map();
  }

  static ModuleNotFoundError = ModuleNotFoundError;

  static tryCastModuleNotFoundError(
    error: unknown,
  ): ModuleNotFoundError | null {
    if (error instanceof ModuleNotFoundError) {
      return error as ModuleNotFoundError;
    }

    const casted = error as ModuleNotFoundError;
    if (casted.code === 'MODULE_NOT_FOUND') {
      return ModuleNotFoundError.duckType(casted);
    }

    return null;
  }

  static clearDefaultResolverCache(): void {
    clearDefaultResolverCache();
    clearCachedLookups();
  }

  // unstable as it should be replaced by https://github.com/nodejs/modules/issues/393, and we don't want people to use it
  static unstable_shouldLoadAsEsm = shouldLoadAsEsm;

  private _isAliasModule(moduleName: string): boolean {
    const moduleNameMapper = this._options.moduleNameMapper;
    if (!moduleNameMapper) {
      return false;
    }

    return moduleNameMapper.some(({regex}) => regex.test(moduleName));
  }

  /**
   * _prepareForResolution is shared between the sync and async module resolution
   * methods, to try to keep them as DRY as possible.
   */
  protected _prepareForResolution(
    dirname: Config.Path,
    moduleName: string,
    options?: ResolveModuleConfig,
  ) {
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

    const skipResolution =
      options && options.skipNodeResolution && !moduleName.includes(path.sep);

    return {extensions, key, moduleDirectory, paths, skipResolution};
  }

  /**
   * _getHasteModulePath attempts to return the path to a haste module.
   */
  protected _getHasteModulePath(moduleName: string) {
    const parts = moduleName.split('/');
    const hastePackage = this.getPackage(parts.shift()!);
    if (hastePackage) {
      return path.join.apply(path, [path.dirname(hastePackage)].concat(parts));
    }
    return null;
  }

  protected _throwModNotFoundError(
    from: Config.Path,
    moduleName: string,
  ): never {
    const relativePath =
      slash(path.relative(this._options.rootDir, from)) || '.';

    throw new ModuleNotFoundError(
      `Cannot find module '${moduleName}' from '${relativePath}'`,
      moduleName,
    );
  }

  protected _getModuleType(moduleName: string): 'node' | 'user' {
    return this.isCoreModule(moduleName) ? 'node' : 'user';
  }

  protected _getMapModuleName(matches: RegExpMatchArray | null) {
    return matches
      ? (moduleName: string) =>
          moduleName.replace(
            /\$([0-9]+)/g,
            (_, index) => matches[parseInt(index, 10)],
          )
      : (moduleName: string) => moduleName;
  }

  setResolver(resolver?: Config.Path | null) {
    this._options.resolver = resolver;
  }

  isCoreModule(moduleName: string): boolean {
    return (
      this._options.hasCoreModules &&
      isBuiltinModule(moduleName) &&
      !this._isAliasModule(moduleName)
    );
  }

  getModule(name: string): Config.Path | null {
    return this._moduleMap.getModule(
      name,
      this._options.defaultPlatform,
      this._supportsNativePlatform,
    );
  }

  getModulePath(from: Config.Path, moduleName: string): Config.Path {
    if (moduleName[0] !== '.' || path.isAbsolute(moduleName)) {
      return moduleName;
    }
    return path.normalize(path.dirname(from) + '/' + moduleName);
  }

  getPackage(name: string): Config.Path | null {
    return this._moduleMap.getPackage(
      name,
      this._options.defaultPlatform,
      this._supportsNativePlatform,
    );
  }

  getModulePaths(from: Config.Path): Array<Config.Path> {
    const cachedModule = this._modulePathCache.get(from);
    if (cachedModule) {
      return cachedModule;
    }

    const moduleDirectory = this._options.moduleDirectories;
    const paths = nodeModulesPaths(from, {moduleDirectory});
    if (paths[paths.length - 1] === undefined) {
      // circumvent node-resolve bug that adds `undefined` as last item.
      paths.pop();
    }
    this._modulePathCache.set(from, paths);
    return paths;
  }
}

export class ResolverAsync extends BaseResolver {
  constructor(moduleMap: IModuleMap, options: ResolverConfig) {
    super(moduleMap, options);
    this.setResolver(options.asyncResolver);
  }

  private async _getAbsolutePathAsync(
    virtualMocks: Map<string, boolean>,
    from: Config.Path,
    moduleName: string,
  ): Promise<Config.Path | null> {
    if (this.isCoreModule(moduleName)) {
      return moduleName;
    }
    const isModuleResolved = await this._isModuleResolvedAsync(
      from,
      moduleName,
    );
    return isModuleResolved
      ? this.getModule(moduleName)
      : await this._getVirtualMockPathAsync(virtualMocks, from, moduleName);
  }

  private async _getMockPathAsync(
    from: Config.Path,
    moduleName: string,
  ): Promise<Config.Path | null> {
    return !this.isCoreModule(moduleName)
      ? await this.getMockModuleAsync(from, moduleName)
      : null;
  }

  private async _getVirtualMockPathAsync(
    virtualMocks: Map<string, boolean>,
    from: Config.Path,
    moduleName: string,
  ): Promise<Config.Path> {
    const virtualMockPath = this.getModulePath(from, moduleName);
    return virtualMocks.get(virtualMockPath)
      ? virtualMockPath
      : moduleName
      ? await this.resolveModuleAsync(from, moduleName)
      : from;
  }

  private async _isModuleResolvedAsync(
    from: Config.Path,
    moduleName: string,
  ): Promise<boolean> {
    return !!(
      this.getModule(moduleName) ||
      (await this.getMockModuleAsync(from, moduleName))
    );
  }

  async resolveStubModuleNameAsync(
    from: Config.Path,
    moduleName: string,
  ): Promise<Config.Path | null> {
    const dirname = path.dirname(from);

    const {extensions, moduleDirectory, paths} = this._prepareForResolution(
      dirname,
      moduleName,
    );
    const moduleNameMapper = this._options.moduleNameMapper;
    const asyncResolver = this._options.asyncResolver;

    if (moduleNameMapper) {
      for (const {moduleName: mappedModuleName, regex} of moduleNameMapper) {
        if (regex.test(moduleName)) {
          // Note: once a moduleNameMapper matches the name, it must result
          // in a module, or else an error is thrown.
          const matches = moduleName.match(regex);
          const mapModuleName = this._getMapModuleName(matches);
          const possibleModuleNames = Array.isArray(mappedModuleName)
            ? mappedModuleName
            : [mappedModuleName];
          let module: string | null = null;
          for (const possibleModuleName of possibleModuleNames) {
            const updatedName = mapModuleName(possibleModuleName);

            module =
              this.getModule(updatedName) ||
              (await ResolverAsync.findNodeModuleAsync(updatedName, {
                asyncResolver,
                basedir: dirname,
                extensions,
                moduleDirectory,
                paths,
                rootDir: this._options.rootDir,
              }));

            if (module) {
              break;
            }
          }

          if (!module) {
            throw createNoMappedModuleFoundError(
              moduleName,
              mapModuleName,
              mappedModuleName,
              regex,
              asyncResolver,
            );
          }
          return module;
        }
      }
    }
    return null;
  }

  async getMockModuleAsync(
    from: Config.Path,
    name: string,
  ): Promise<Config.Path | null> {
    const mock = this._moduleMap.getMockModule(name);
    if (mock) {
      return mock;
    } else {
      const moduleName = await this.resolveStubModuleNameAsync(from, name);
      if (moduleName) {
        return this.getModule(moduleName) || moduleName;
      }
    }
    return null;
  }

  async getModuleIDAsync(
    virtualMocks: Map<string, boolean>,
    from: Config.Path,
    _moduleName?: string,
  ): Promise<string> {
    const moduleName = _moduleName || '';

    const key = from + path.delimiter + moduleName;
    const cachedModuleID = this._moduleIDCache.get(key);
    if (cachedModuleID) {
      return cachedModuleID;
    }

    const moduleType = this._getModuleType(moduleName);
    const absolutePath = await this._getAbsolutePathAsync(
      virtualMocks,
      from,
      moduleName,
    );
    const mockPath = await this._getMockPathAsync(from, moduleName);

    const sep = path.delimiter;
    const id =
      moduleType +
      sep +
      (absolutePath ? absolutePath + sep : '') +
      (mockPath ? mockPath + sep : '');

    this._moduleIDCache.set(key, id);
    return id;
  }

  static async findNodeModuleAsync(
    path: Config.Path,
    options: FindNodeModuleConfig,
  ): Promise<Config.Path | null> {
    const resolver: typeof defaultResolverAsync = options.asyncResolver
      ? require(options.asyncResolver)
      : defaultResolverAsync;
    const paths = options.paths;

    try {
      const result = await resolver(path, {
        basedir: options.basedir,
        browser: options.browser,
        defaultResolver,
        extensions: options.extensions,
        moduleDirectory: options.moduleDirectory,
        paths: paths ? (nodePaths || []).concat(paths) : nodePaths,
        rootDir: options.rootDir,
      });
      return result.path;
    } catch (e) {
      if (options.throwIfNotFound) {
        throw e;
      }
    }
    return null;
  }

  async resolveModuleFromDirIfExistsAsync(
    dirname: Config.Path,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): Promise<Config.Path | null> {
    const {
      extensions,
      key,
      moduleDirectory,
      paths,
      skipResolution,
    } = this._prepareForResolution(dirname, moduleName, options);

    let module;

    // 1. If we have already resolved this module for this directory name,
    // return a value from the cache.
    const cacheResult = this._moduleNameCache.get(key);
    if (cacheResult) {
      return cacheResult;
    }

    // 2. Check if the module is a haste module.
    module = this.getModule(moduleName);
    if (module) {
      this._moduleNameCache.set(key, module);
      return module;
    }

    // 3. Check if the module is a node module and resolve it based on
    // the node module resolution algorithm. If skipNodeResolution is given we
    // ignore all modules that look like node modules (ie. are not relative
    // requires). This enables us to speed up resolution when we build a
    // dependency graph because we don't have to look at modules that may not
    // exist and aren't mocked.
    const resolveNodeModule = async (
      name: Config.Path,
      throwIfNotFound = false,
    ) =>
      await ResolverAsync.findNodeModuleAsync(name, {
        asyncResolver: this._options.asyncResolver,
        basedir: dirname,
        extensions,
        moduleDirectory,
        paths,
        rootDir: this._options.rootDir,
        throwIfNotFound,
      });

    if (!skipResolution) {
      module = await resolveNodeModule(
        moduleName,
        Boolean(process.versions.pnp),
      );

      if (module) {
        this._moduleNameCache.set(key, module);
        return module;
      }
    }

    // 4. Resolve "haste packages" which are `package.json` files outside of
    // `node_modules` folders anywhere in the file system.
    try {
      const hasteModulePath = this._getHasteModulePath(moduleName);
      if (hasteModulePath) {
        // try resolving with custom resolver first to support extensions,
        // then fallback to require.resolve
        const resolvedModule =
          (await resolveNodeModule(hasteModulePath)) ||
          // QUESTION: should this be async?
          require.resolve(hasteModulePath);
        this._moduleNameCache.set(key, resolvedModule);
        return resolvedModule;
      }
    } catch {}

    return null;
  }

  /* eslint-disable-next-line consistent-return */
  async resolveModuleAsync(
    from: Config.Path,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): Promise<Config.Path> {
    const dirname = path.dirname(from);
    const module =
      (await this.resolveStubModuleNameAsync(from, moduleName)) ||
      (await this.resolveModuleFromDirIfExistsAsync(
        dirname,
        moduleName,
        options,
      ));

    if (module) return module;

    // 5. Throw an error if the module could not be found. `resolve.sync` only
    // produces an error based on the dirname but we have the actual current
    // module name available.
    this._throwModNotFoundError(from, moduleName);
  }
}

export default class Resolver extends BaseResolver {
  constructor(moduleMap: IModuleMap, options: ResolverConfig) {
    super(moduleMap, options);
    this.setResolver(options.resolver);
  }

  private _getAbsolutePath(
    virtualMocks: Map<string, boolean>,
    from: Config.Path,
    moduleName: string,
  ): Config.Path | null {
    if (this.isCoreModule(moduleName)) {
      return moduleName;
    }
    return this._isModuleResolved(from, moduleName)
      ? this.getModule(moduleName)
      : this._getVirtualMockPath(virtualMocks, from, moduleName);
  }

  private _getMockPath(
    from: Config.Path,
    moduleName: string,
  ): Config.Path | null {
    return !this.isCoreModule(moduleName)
      ? this.getMockModule(from, moduleName)
      : null;
  }

  private _getVirtualMockPath(
    virtualMocks: Map<string, boolean>,
    from: Config.Path,
    moduleName: string,
  ): Config.Path {
    const virtualMockPath = this.getModulePath(from, moduleName);
    return virtualMocks.get(virtualMockPath)
      ? virtualMockPath
      : moduleName
      ? this.resolveModule(from, moduleName)
      : from;
  }

  private _isModuleResolved(from: Config.Path, moduleName: string): boolean {
    return !!(
      this.getModule(moduleName) || this.getMockModule(from, moduleName)
    );
  }

  resolveStubModuleName(
    from: Config.Path,
    moduleName: string,
  ): Config.Path | null {
    const dirname = path.dirname(from);

    const {extensions, moduleDirectory, paths} = this._prepareForResolution(
      dirname,
      moduleName,
    );
    const moduleNameMapper = this._options.moduleNameMapper;
    const resolver = this._options.resolver;

    if (moduleNameMapper) {
      for (const {moduleName: mappedModuleName, regex} of moduleNameMapper) {
        if (regex.test(moduleName)) {
          // Note: once a moduleNameMapper matches the name, it must result
          // in a module, or else an error is thrown.
          const matches = moduleName.match(regex);
          const mapModuleName = this._getMapModuleName(matches);
          const possibleModuleNames = Array.isArray(mappedModuleName)
            ? mappedModuleName
            : [mappedModuleName];
          let module: string | null = null;
          for (const possibleModuleName of possibleModuleNames) {
            const updatedName = mapModuleName(possibleModuleName);

            module =
              this.getModule(updatedName) ||
              Resolver.findNodeModule(updatedName, {
                basedir: dirname,
                extensions,
                moduleDirectory,
                paths,
                resolver,
                rootDir: this._options.rootDir,
              });

            if (module) {
              break;
            }
          }

          if (!module) {
            throw createNoMappedModuleFoundError(
              moduleName,
              mapModuleName,
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

  getMockModule(from: Config.Path, name: string): Config.Path | null {
    const mock = this._moduleMap.getMockModule(name);
    if (mock) {
      return mock;
    } else {
      const moduleName = this.resolveStubModuleName(from, name);
      if (moduleName) {
        return this.getModule(moduleName) || moduleName;
      }
    }
    return null;
  }

  getModuleID(
    virtualMocks: Map<string, boolean>,
    from: Config.Path,
    _moduleName?: string,
  ): string {
    const moduleName = _moduleName || '';

    const key = from + path.delimiter + moduleName;
    const cachedModuleID = this._moduleIDCache.get(key);
    if (cachedModuleID) {
      return cachedModuleID;
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

    this._moduleIDCache.set(key, id);
    return id;
  }

  static findNodeModule(
    path: Config.Path,
    options: FindNodeModuleConfig,
  ): Config.Path | null {
    const resolver: typeof defaultResolver = options.resolver
      ? require(options.resolver)
      : defaultResolver;
    const paths = options.paths;

    try {
      return resolver(path, {
        basedir: options.basedir,
        browser: options.browser,
        defaultResolver,
        extensions: options.extensions,
        moduleDirectory: options.moduleDirectory,
        paths: paths ? (nodePaths || []).concat(paths) : nodePaths,
        rootDir: options.rootDir,
      });
    } catch (e) {
      if (options.throwIfNotFound) {
        throw e;
      }
    }
    return null;
  }

  resolveModuleFromDirIfExists(
    dirname: Config.Path,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): Config.Path | null {
    const {
      extensions,
      key,
      moduleDirectory,
      paths,
      skipResolution,
    } = this._prepareForResolution(dirname, moduleName, options);

    let module;

    // 1. If we have already resolved this module for this directory name,
    // return a value from the cache.
    const cacheResult = this._moduleNameCache.get(key);
    if (cacheResult) {
      return cacheResult;
    }

    // 2. Check if the module is a haste module.
    module = this.getModule(moduleName);
    if (module) {
      this._moduleNameCache.set(key, module);
      return module;
    }

    // 3. Check if the module is a node module and resolve it based on
    // the node module resolution algorithm. If skipNodeResolution is given we
    // ignore all modules that look like node modules (ie. are not relative
    // requires). This enables us to speed up resolution when we build a
    // dependency graph because we don't have to look at modules that may not
    // exist and aren't mocked.
    const resolveNodeModule = (name: Config.Path, throwIfNotFound = false) =>
      Resolver.findNodeModule(name, {
        basedir: dirname,
        extensions,
        moduleDirectory,
        paths,
        resolver: this._options.resolver,
        rootDir: this._options.rootDir,
        throwIfNotFound,
      });

    if (!skipResolution) {
      module = resolveNodeModule(moduleName, Boolean(process.versions.pnp));

      if (module) {
        this._moduleNameCache.set(key, module);
        return module;
      }
    }

    // 4. Resolve "haste packages" which are `package.json` files outside of
    // `node_modules` folders anywhere in the file system.
    try {
      const hasteModulePath = this._getHasteModulePath(moduleName);
      if (hasteModulePath) {
        // try resolving with custom resolver first to support extensions,
        // then fallback to require.resolve
        const resolvedModule =
          resolveNodeModule(hasteModulePath) ||
          require.resolve(hasteModulePath);
        this._moduleNameCache.set(key, resolvedModule);
        return resolvedModule;
      }
    } catch {}

    return null;
  }

  /* eslint-disable-next-line consistent-return */
  resolveModule(
    from: Config.Path,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): Config.Path {
    const dirname = path.dirname(from);
    const module =
      this.resolveStubModuleName(from, moduleName) ||
      this.resolveModuleFromDirIfExists(dirname, moduleName, options);
    if (module) return module;

    // 5. Throw an error if the module could not be found. `resolve.sync` only
    // produces an error based on the dirname but we have the actual current
    // module name available.
    this._throwModNotFoundError(from, moduleName);
  }
}

const createNoMappedModuleFoundError = (
  moduleName: string,
  mapModuleName: (moduleName: string) => string,
  mappedModuleName: string | Array<string>,
  regex: RegExp,
  resolver?: ((...args: Array<unknown>) => unknown) | string | null,
) => {
  const mappedAs = Array.isArray(mappedModuleName)
    ? JSON.stringify(mappedModuleName.map(mapModuleName), null, 2)
    : mappedModuleName;
  const original = Array.isArray(mappedModuleName)
    ? JSON.stringify(mappedModuleName, null, 6) // using 6 because of misalignment when nested below
        .slice(0, -1) + '    ]' /// align last bracket correctly as well
    : mappedModuleName;

  const error = new Error(
    chalk.red(`${chalk.bold('Configuration error')}:

Could not locate module ${chalk.bold(moduleName)} mapped as:
${chalk.bold(mappedAs)}.

Please check your configuration for these entries:
{
  "moduleNameMapper": {
    "${regex.toString()}": "${chalk.bold(original)}"
  },
  "resolver": ${chalk.bold(String(resolver))}
}`),
  );

  error.name = '';

  return error;
};
