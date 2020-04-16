/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {URL, fileURLToPath} from 'url';
import * as path from 'path';
import {Script, compileFunction} from 'vm';
import * as nativeModule from 'module';
import type {Config, Global} from '@jest/types';
import type {
  Jest,
  JestEnvironment,
  LocalModuleRequire,
  Module,
  ModuleWrapper,
} from '@jest/environment';
import type * as JestGlobals from '@jest/globals';
import type {SourceMapRegistry} from '@jest/source-map';
import {formatStackTrace, separateMessageFromStack} from 'jest-message-util';
import {createDirectory, deepCyclicCopy} from 'jest-util';
import {escapePathForRegex} from 'jest-regex-util';
import {
  ScriptTransformer,
  ShouldInstrumentOptions,
  TransformResult,
  TransformationOptions,
  handlePotentialSyntaxError,
  shouldInstrument,
} from '@jest/transform';
import type {V8CoverageResult} from '@jest/test-result';
import {CoverageInstrumenter, V8Coverage} from 'collect-v8-coverage';
import * as fs from 'graceful-fs';
import {run as cliRun} from './cli';
import {options as cliOptions} from './cli/args';
import {findSiblingsWithFileExtension} from './helpers';
import type {Context as JestContext} from './types';
import jestMock = require('jest-mock');
import HasteMap = require('jest-haste-map');
import Resolver = require('jest-resolve');
import Snapshot = require('jest-snapshot');
import stripBOM = require('strip-bom');

interface JestGlobalsValues extends Global.TestFrameworkGlobals {
  jest: JestGlobals.jest;
  expect: JestGlobals.expect;
}

type HasteMapOptions = {
  console?: Console;
  maxWorkers: number;
  resetCache: boolean;
  watch?: boolean;
  watchman: boolean;
};

type InternalModuleOptions = {
  isInternalModule: boolean;
  supportsDynamicImport: boolean;
  supportsStaticESM: boolean;
};

const defaultTransformOptions: InternalModuleOptions = {
  isInternalModule: false,
  supportsDynamicImport: false,
  supportsStaticESM: false,
};

type InitialModule = Partial<Module> &
  Pick<Module, 'children' | 'exports' | 'filename' | 'id' | 'loaded'>;
type ModuleRegistry = Map<string, InitialModule | Module>;
type ResolveOptions = Parameters<typeof require.resolve>[1];

type BooleanObject = Record<string, boolean>;
type CacheFS = {[path: string]: string};

namespace Runtime {
  export type Context = JestContext;
  // ditch this export when moving to esm - for now we need it for to avoid faulty type elision
  export type RuntimeType = Runtime;
}

const testTimeoutSymbol = Symbol.for('TEST_TIMEOUT_SYMBOL');
const retryTimesSymbol = Symbol.for('RETRY_TIMES');

const NODE_MODULES = path.sep + 'node_modules' + path.sep;

const getModuleNameMapper = (config: Config.ProjectConfig) => {
  if (
    Array.isArray(config.moduleNameMapper) &&
    config.moduleNameMapper.length
  ) {
    return config.moduleNameMapper.map(([regex, moduleName]) => ({
      moduleName,
      regex: new RegExp(regex),
    }));
  }
  return null;
};

const unmockRegExpCache = new WeakMap();

const EVAL_RESULT_VARIABLE = 'Object.<anonymous>';

type RunScriptEvalResult = {[EVAL_RESULT_VARIABLE]: ModuleWrapper};

/* eslint-disable-next-line no-redeclare */
class Runtime {
  private _cacheFS: CacheFS;
  private _config: Config.ProjectConfig;
  private _coverageOptions: ShouldInstrumentOptions;
  private _currentlyExecutingModulePath: string;
  private _environment: JestEnvironment;
  private _explicitShouldMock: BooleanObject;
  private _internalModuleRegistry: ModuleRegistry;
  private _isCurrentlyExecutingManualMock: string | null;
  private _mockFactories: Record<string, () => unknown>;
  private _mockMetaDataCache: {
    [key: string]: jestMock.MockFunctionMetadata<unknown, Array<unknown>>;
  };
  private _mockRegistry: Map<string, any>;
  private _isolatedMockRegistry: Map<string, any> | null;
  private _moduleMocker: typeof jestMock;
  private _isolatedModuleRegistry: ModuleRegistry | null;
  private _moduleRegistry: ModuleRegistry;
  private _needsCoverageMapped: Set<string>;
  private _resolver: Resolver;
  private _shouldAutoMock: boolean;
  private _shouldMockModuleCache: BooleanObject;
  private _shouldUnmockTransitiveDependenciesCache: BooleanObject;
  private _sourceMapRegistry: SourceMapRegistry;
  private _scriptTransformer: ScriptTransformer;
  private _fileTransforms: Map<string, TransformResult>;
  private _v8CoverageInstrumenter: CoverageInstrumenter | undefined;
  private _v8CoverageResult: V8Coverage | undefined;
  private _transitiveShouldMock: BooleanObject;
  private _unmockList: RegExp | undefined;
  private _virtualMocks: BooleanObject;
  private _moduleImplementation?: typeof nativeModule.Module;
  private jestObjectCaches: Map<string, Jest>;

  constructor(
    config: Config.ProjectConfig,
    environment: JestEnvironment,
    resolver: Resolver,
    cacheFS?: CacheFS,
    coverageOptions?: ShouldInstrumentOptions,
  ) {
    this._cacheFS = cacheFS || Object.create(null);
    this._config = config;
    this._coverageOptions = coverageOptions || {
      changedFiles: undefined,
      collectCoverage: false,
      coverageProvider: 'babel',
    };
    this._currentlyExecutingModulePath = '';
    this._environment = environment;
    this._explicitShouldMock = Object.create(null);
    this._internalModuleRegistry = new Map();
    this._isCurrentlyExecutingManualMock = null;
    this._mockFactories = Object.create(null);
    this._mockRegistry = new Map();
    // during setup, this cannot be null (and it's fine to explode if it is)
    this._moduleMocker = this._environment.moduleMocker!;
    this._isolatedModuleRegistry = null;
    this._isolatedMockRegistry = null;
    this._moduleRegistry = new Map();
    this._needsCoverageMapped = new Set();
    this._resolver = resolver;
    this._scriptTransformer = new ScriptTransformer(config);
    this._shouldAutoMock = config.automock;
    this._sourceMapRegistry = Object.create(null);
    this._fileTransforms = new Map();
    this._virtualMocks = Object.create(null);
    this.jestObjectCaches = new Map();

    this._mockMetaDataCache = Object.create(null);
    this._shouldMockModuleCache = Object.create(null);
    this._shouldUnmockTransitiveDependenciesCache = Object.create(null);
    this._transitiveShouldMock = Object.create(null);

    this._unmockList = unmockRegExpCache.get(config);
    if (!this._unmockList && config.unmockedModulePathPatterns) {
      this._unmockList = new RegExp(
        config.unmockedModulePathPatterns.join('|'),
      );
      unmockRegExpCache.set(config, this._unmockList);
    }

    if (config.automock) {
      config.setupFiles.forEach(filePath => {
        if (filePath && filePath.includes(NODE_MODULES)) {
          const moduleID = this._resolver.getModuleID(
            this._virtualMocks,
            filePath,
          );
          this._transitiveShouldMock[moduleID] = false;
        }
      });
    }

    this.resetModules();
  }

  static shouldInstrument = shouldInstrument;

  static createContext(
    config: Config.ProjectConfig,
    options: {
      console?: Console;
      maxWorkers: number;
      watch?: boolean;
      watchman: boolean;
    },
  ): Promise<JestContext> {
    createDirectory(config.cacheDirectory);
    const instance = Runtime.createHasteMap(config, {
      console: options.console,
      maxWorkers: options.maxWorkers,
      resetCache: !config.cache,
      watch: options.watch,
      watchman: options.watchman,
    });
    return instance.build().then(
      hasteMap => ({
        config,
        hasteFS: hasteMap.hasteFS,
        moduleMap: hasteMap.moduleMap,
        resolver: Runtime.createResolver(config, hasteMap.moduleMap),
      }),
      error => {
        throw error;
      },
    );
  }

  static createHasteMap(
    config: Config.ProjectConfig,
    options?: HasteMapOptions,
  ): HasteMap {
    const ignorePatternParts = [
      ...config.modulePathIgnorePatterns,
      ...(options && options.watch ? config.watchPathIgnorePatterns : []),
      config.cacheDirectory.startsWith(config.rootDir + path.sep) &&
        config.cacheDirectory,
    ].filter(Boolean);
    const ignorePattern =
      ignorePatternParts.length > 0
        ? new RegExp(ignorePatternParts.join('|'))
        : undefined;

    return new HasteMap({
      cacheDirectory: config.cacheDirectory,
      computeSha1: config.haste.computeSha1,
      console: options && options.console,
      dependencyExtractor: config.dependencyExtractor,
      extensions: [Snapshot.EXTENSION].concat(config.moduleFileExtensions),
      hasteImplModulePath: config.haste.hasteImplModulePath,
      ignorePattern,
      maxWorkers: (options && options.maxWorkers) || 1,
      mocksPattern: escapePathForRegex(path.sep + '__mocks__' + path.sep),
      name: config.name,
      platforms: config.haste.platforms || ['ios', 'android'],
      providesModuleNodeModules: config.haste.providesModuleNodeModules,
      resetCache: options && options.resetCache,
      retainAllFiles: false,
      rootDir: config.rootDir,
      roots: config.roots,
      throwOnModuleCollision: config.haste.throwOnModuleCollision,
      useWatchman: options && options.watchman,
      watch: options && options.watch,
    });
  }

  static createResolver(
    config: Config.ProjectConfig,
    moduleMap: HasteMap.ModuleMap,
  ): Resolver {
    return new Resolver(moduleMap, {
      browser: config.browser,
      defaultPlatform: config.haste.defaultPlatform,
      extensions: config.moduleFileExtensions.map(extension => '.' + extension),
      hasCoreModules: true,
      moduleDirectories: config.moduleDirectories,
      moduleNameMapper: getModuleNameMapper(config),
      modulePaths: config.modulePaths,
      platforms: config.haste.platforms,
      resolver: config.resolver,
      rootDir: config.rootDir,
    });
  }

  static runCLI(args?: Config.Argv, info?: Array<string>): Promise<void> {
    return cliRun(args, info);
  }

  static getCLIOptions(): typeof cliOptions {
    return cliOptions;
  }

  requireModule<T = unknown>(
    from: Config.Path,
    moduleName?: string,
    options?: InternalModuleOptions,
    isRequireActual?: boolean | null,
  ): T {
    const moduleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
      moduleName,
    );
    let modulePath: string | undefined;

    // Some old tests rely on this mocking behavior. Ideally we'll change this
    // to be more explicit.
    const moduleResource = moduleName && this._resolver.getModule(moduleName);
    const manualMock =
      moduleName && this._resolver.getMockModule(from, moduleName);
    if (
      (!options || !options.isInternalModule) &&
      !isRequireActual &&
      !moduleResource &&
      manualMock &&
      manualMock !== this._isCurrentlyExecutingManualMock &&
      this._explicitShouldMock[moduleID] !== false
    ) {
      modulePath = manualMock;
    }

    if (moduleName === '@jest/globals') {
      // @ts-ignore: we don't care that it's not assignable to T
      return this.getGlobalsForFile(from);
    }

    if (moduleName && this._resolver.isCoreModule(moduleName)) {
      return this._requireCoreModule(moduleName);
    }

    if (!modulePath) {
      modulePath = this._resolveModule(from, moduleName);
    }

    let moduleRegistry;

    if (!options || !options.isInternalModule) {
      if (
        this._moduleRegistry.get(modulePath) ||
        !this._isolatedModuleRegistry
      ) {
        moduleRegistry = this._moduleRegistry;
      } else {
        moduleRegistry = this._isolatedModuleRegistry;
      }
    } else {
      moduleRegistry = this._internalModuleRegistry;
    }

    const module = moduleRegistry.get(modulePath);
    if (module) {
      return module.exports;
    }

    // We must register the pre-allocated module object first so that any
    // circular dependencies that may arise while evaluating the module can
    // be satisfied.
    const localModule: InitialModule = {
      children: [],
      exports: {},
      filename: modulePath,
      id: modulePath,
      loaded: false,
    };
    moduleRegistry.set(modulePath, localModule);

    this._loadModule(
      localModule,
      from,
      moduleName,
      modulePath,
      options,
      moduleRegistry,
    );

    return localModule.exports;
  }

  requireInternalModule<T = unknown>(from: Config.Path, to?: string): T {
    return this.requireModule(from, to, {
      isInternalModule: true,
      supportsDynamicImport: false,
      supportsStaticESM: false,
    });
  }

  requireActual<T = unknown>(from: Config.Path, moduleName: string): T {
    return this.requireModule(from, moduleName, undefined, true);
  }

  requireMock<T = unknown>(from: Config.Path, moduleName: string): T {
    const moduleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
      moduleName,
    );

    if (
      this._isolatedMockRegistry &&
      this._isolatedMockRegistry.get(moduleID)
    ) {
      return this._isolatedMockRegistry.get(moduleID);
    } else if (this._mockRegistry.get(moduleID)) {
      return this._mockRegistry.get(moduleID);
    }

    const mockRegistry = this._isolatedMockRegistry || this._mockRegistry;

    if (moduleID in this._mockFactories) {
      const module = this._mockFactories[moduleID]();
      mockRegistry.set(moduleID, module);
      return module as T;
    }

    const manualMockOrStub = this._resolver.getMockModule(from, moduleName);
    let modulePath;
    if (manualMockOrStub) {
      modulePath = this._resolveModule(from, manualMockOrStub);
    } else {
      modulePath = this._resolveModule(from, moduleName);
    }

    let isManualMock =
      manualMockOrStub &&
      !this._resolver.resolveStubModuleName(from, moduleName);
    if (!isManualMock) {
      // If the actual module file has a __mocks__ dir sitting immediately next
      // to it, look to see if there is a manual mock for this file.
      //
      // subDir1/my_module.js
      // subDir1/__mocks__/my_module.js
      // subDir2/my_module.js
      // subDir2/__mocks__/my_module.js
      //
      // Where some other module does a relative require into each of the
      // respective subDir{1,2} directories and expects a manual mock
      // corresponding to that particular my_module.js file.

      const moduleDir = path.dirname(modulePath);
      const moduleFileName = path.basename(modulePath);
      const potentialManualMock = path.join(
        moduleDir,
        '__mocks__',
        moduleFileName,
      );
      if (fs.existsSync(potentialManualMock)) {
        isManualMock = true;
        modulePath = potentialManualMock;
      }
    }
    if (isManualMock) {
      const localModule: InitialModule = {
        children: [],
        exports: {},
        filename: modulePath,
        id: modulePath,
        loaded: false,
      };

      this._loadModule(
        localModule,
        from,
        moduleName,
        modulePath,
        undefined,
        mockRegistry,
      );

      mockRegistry.set(moduleID, localModule.exports);
    } else {
      // Look for a real module to generate an automock from
      mockRegistry.set(moduleID, this._generateMock(from, moduleName));
    }

    return mockRegistry.get(moduleID);
  }

  private _loadModule(
    localModule: InitialModule,
    from: Config.Path,
    moduleName: string | undefined,
    modulePath: Config.Path,
    options: InternalModuleOptions | undefined,
    moduleRegistry: ModuleRegistry,
  ) {
    if (path.extname(modulePath) === '.json') {
      const text = stripBOM(fs.readFileSync(modulePath, 'utf8'));

      const transformedFile = this._scriptTransformer.transformJson(
        modulePath,
        this._getFullTransformationOptions(options),
        text,
      );

      localModule.exports = this._environment.global.JSON.parse(
        transformedFile,
      );
    } else if (path.extname(modulePath) === '.node') {
      localModule.exports = require(modulePath);
    } else {
      // Only include the fromPath if a moduleName is given. Else treat as root.
      const fromPath = moduleName ? from : null;
      this._execModule(localModule, options, moduleRegistry, fromPath);
    }
    localModule.loaded = true;
  }

  private _getFullTransformationOptions(
    options: InternalModuleOptions = defaultTransformOptions,
  ): TransformationOptions {
    return {
      ...options,
      changedFiles: this._coverageOptions.changedFiles,
      collectCoverage: this._coverageOptions.collectCoverage,
      coverageProvider: this._coverageOptions.coverageProvider,
    };
  }

  requireModuleOrMock(from: Config.Path, moduleName: string): unknown {
    try {
      if (this._shouldMock(from, moduleName)) {
        return this.requireMock(from, moduleName);
      } else {
        return this.requireModule(from, moduleName);
      }
    } catch (e) {
      const moduleNotFound = Resolver.tryCastModuleNotFoundError(e);
      if (moduleNotFound) {
        if (
          moduleNotFound.siblingWithSimilarExtensionFound === null ||
          moduleNotFound.siblingWithSimilarExtensionFound === undefined
        ) {
          moduleNotFound.hint = findSiblingsWithFileExtension(
            this._config.moduleFileExtensions,
            from,
            moduleNotFound.moduleName || moduleName,
          );
          moduleNotFound.siblingWithSimilarExtensionFound = Boolean(
            moduleNotFound.hint,
          );
        }
        moduleNotFound.buildMessage(this._config.rootDir);
        throw moduleNotFound;
      }
      throw e;
    }
  }

  isolateModules(fn: () => void): void {
    if (this._isolatedModuleRegistry || this._isolatedMockRegistry) {
      throw new Error(
        'isolateModules cannot be nested inside another isolateModules.',
      );
    }
    this._isolatedModuleRegistry = new Map();
    this._isolatedMockRegistry = new Map();
    try {
      fn();
    } finally {
      this._isolatedModuleRegistry = null;
      this._isolatedMockRegistry = null;
    }
  }

  resetModules(): void {
    this._isolatedModuleRegistry = null;
    this._isolatedMockRegistry = null;
    this._mockRegistry.clear();
    this._moduleRegistry.clear();

    if (this._environment) {
      if (this._environment.global) {
        const envGlobal = this._environment.global;
        (Object.keys(envGlobal) as Array<keyof NodeJS.Global>).forEach(key => {
          const globalMock = envGlobal[key];
          if (
            ((typeof globalMock === 'object' && globalMock !== null) ||
              typeof globalMock === 'function') &&
            globalMock._isMockFunction === true
          ) {
            globalMock.mockClear();
          }
        });
      }

      if (this._environment.fakeTimers) {
        this._environment.fakeTimers.clearAllTimers();
      }
    }
  }

  async collectV8Coverage(): Promise<void> {
    this._v8CoverageInstrumenter = new CoverageInstrumenter();

    await this._v8CoverageInstrumenter.startInstrumenting();
  }

  async stopCollectingV8Coverage(): Promise<void> {
    if (!this._v8CoverageInstrumenter) {
      throw new Error('You need to call `collectV8Coverage` first.');
    }
    this._v8CoverageResult = await this._v8CoverageInstrumenter.stopInstrumenting();
  }

  getAllCoverageInfoCopy(): JestEnvironment['global']['__coverage__'] {
    return deepCyclicCopy(this._environment.global.__coverage__);
  }

  getAllV8CoverageInfoCopy(): V8CoverageResult {
    if (!this._v8CoverageResult) {
      throw new Error('You need to `stopCollectingV8Coverage` first');
    }

    return this._v8CoverageResult
      .filter(res => res.url.startsWith('file://'))
      .map(res => ({...res, url: fileURLToPath(res.url)}))
      .filter(
        res =>
          // TODO: will this work on windows? It might be better if `shouldInstrument` deals with it anyways
          res.url.startsWith(this._config.rootDir) &&
          this._fileTransforms.has(res.url) &&
          shouldInstrument(res.url, this._coverageOptions, this._config),
      )
      .map(result => {
        const transformedFile = this._fileTransforms.get(result.url);

        return {
          codeTransformResult: transformedFile,
          result,
        };
      });
  }

  getSourceMapInfo(coveredFiles: Set<string>): Record<string, string> {
    return Object.keys(this._sourceMapRegistry).reduce<Record<string, string>>(
      (result, sourcePath) => {
        if (
          coveredFiles.has(sourcePath) &&
          this._needsCoverageMapped.has(sourcePath) &&
          fs.existsSync(this._sourceMapRegistry[sourcePath])
        ) {
          result[sourcePath] = this._sourceMapRegistry[sourcePath];
        }
        return result;
      },
      {},
    );
  }

  getSourceMaps(): SourceMapRegistry {
    return this._sourceMapRegistry;
  }

  setMock(
    from: string,
    moduleName: string,
    mockFactory: () => unknown,
    options?: {virtual?: boolean},
  ): void {
    if (options && options.virtual) {
      const mockPath = this._resolver.getModulePath(from, moduleName);
      this._virtualMocks[mockPath] = true;
    }
    const moduleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
      moduleName,
    );
    this._explicitShouldMock[moduleID] = true;
    this._mockFactories[moduleID] = mockFactory;
  }

  restoreAllMocks(): void {
    this._moduleMocker.restoreAllMocks();
  }

  resetAllMocks(): void {
    this._moduleMocker.resetAllMocks();
  }

  clearAllMocks(): void {
    this._moduleMocker.clearAllMocks();
  }

  private _resolveModule(from: Config.Path, to?: string) {
    return to ? this._resolver.resolveModule(from, to) : from;
  }

  private _requireResolve(
    from: Config.Path,
    moduleName?: string,
    options: ResolveOptions = {},
  ) {
    if (moduleName == null) {
      throw new Error(
        'The first argument to require.resolve must be a string. Received null or undefined.',
      );
    }

    const {paths} = options;

    if (paths) {
      for (const p of paths) {
        const absolutePath = path.resolve(from, '..', p);
        const module = this._resolver.resolveModuleFromDirIfExists(
          absolutePath,
          moduleName,
          // required to also resolve files without leading './' directly in the path
          {paths: [absolutePath]},
        );
        if (module) {
          return module;
        }
      }

      throw new Resolver.ModuleNotFoundError(
        `Cannot resolve module '${moduleName}' from paths ['${paths.join(
          "', '",
        )}'] from ${from}`,
      );
    }
    try {
      return this._resolveModule(from, moduleName);
    } catch (err) {
      const module = this._resolver.getMockModule(from, moduleName);

      if (module) {
        return module;
      } else {
        throw err;
      }
    }
  }

  private _requireResolvePaths(from: Config.Path, moduleName?: string) {
    if (moduleName == null) {
      throw new Error(
        'The first argument to require.resolve.paths must be a string. Received null or undefined.',
      );
    }
    if (!moduleName.length) {
      throw new Error(
        'The first argument to require.resolve.paths must not be the empty string.',
      );
    }

    if (moduleName[0] === '.') {
      return [path.resolve(from, '..')];
    }
    if (this._resolver.isCoreModule(moduleName)) {
      return null;
    }
    return this._resolver.getModulePaths(path.resolve(from, '..'));
  }

  private _execModule(
    localModule: InitialModule,
    options: InternalModuleOptions | undefined,
    moduleRegistry: ModuleRegistry,
    from: Config.Path | null,
  ) {
    // If the environment was disposed, prevent this module from being executed.
    if (!this._environment.global) {
      return;
    }

    const filename = localModule.filename;
    const lastExecutingModulePath = this._currentlyExecutingModulePath;
    this._currentlyExecutingModulePath = filename;
    const origCurrExecutingManualMock = this._isCurrentlyExecutingManualMock;
    this._isCurrentlyExecutingManualMock = filename;

    const dirname = path.dirname(filename);
    localModule.children = [];

    Object.defineProperty(localModule, 'parent', {
      enumerable: true,
      get() {
        const key = from || '';
        return moduleRegistry.get(key) || null;
      },
    });

    localModule.paths = this._resolver.getModulePaths(dirname);
    Object.defineProperty(localModule, 'require', {
      value: this._createRequireImplementation(localModule, options),
    });
    const transformedFile = this._scriptTransformer.transform(
      filename,
      this._getFullTransformationOptions(options),
      this._cacheFS[filename],
    );

    // we only care about non-internal modules
    if (!options || !options.isInternalModule) {
      this._fileTransforms.set(filename, transformedFile);
    }

    if (transformedFile.sourceMapPath) {
      this._sourceMapRegistry[filename] = transformedFile.sourceMapPath;
      if (transformedFile.mapCoverage) {
        this._needsCoverageMapped.add(filename);
      }
    }

    let compiledFunction: ModuleWrapper | null = null;

    // Use this if available instead of deprecated `JestEnvironment.runScript`
    if (typeof this._environment.getVmContext === 'function') {
      const vmContext = this._environment.getVmContext();

      if (vmContext) {
        if (typeof compileFunction === 'function') {
          try {
            compiledFunction = compileFunction(
              transformedFile.code,
              this.constructInjectedModuleParameters(),
              {
                filename,
                parsingContext: vmContext,
              },
            ) as ModuleWrapper;
          } catch (e) {
            throw handlePotentialSyntaxError(e);
          }
        } else {
          const script = this.createScriptFromCode(
            transformedFile.code,
            filename,
          );

          const runScript = script.runInContext(
            vmContext,
          ) as RunScriptEvalResult;

          if (runScript === null) {
            compiledFunction = null;
          } else {
            compiledFunction = runScript[EVAL_RESULT_VARIABLE];
          }
        }
      }
    } else {
      const script = this.createScriptFromCode(transformedFile.code, filename);

      const runScript = this._environment.runScript<RunScriptEvalResult>(
        script,
      );

      if (runScript === null) {
        compiledFunction = null;
      } else {
        compiledFunction = runScript[EVAL_RESULT_VARIABLE];
      }
    }

    if (compiledFunction === null) {
      this._logFormattedReferenceError(
        'You are trying to `import` a file after the Jest environment has been torn down.',
      );
      process.exitCode = 1;
      return;
    }

    const jestObject = this._createJestObjectFor(
      filename,
      localModule.require as LocalModuleRequire,
    );

    this.jestObjectCaches.set(filename, jestObject);

    try {
      compiledFunction.call(
        localModule.exports,
        localModule as NodeModule, // module object
        localModule.exports, // module exports
        localModule.require as typeof require, // require implementation
        dirname, // __dirname
        filename, // __filename
        this._environment.global, // global object
        jestObject, // jest object
        ...this._config.extraGlobals.map(globalVariable => {
          if (this._environment.global[globalVariable]) {
            return this._environment.global[globalVariable];
          }

          throw new Error(
            `You have requested '${globalVariable}' as a global variable, but it was not present. Please check your config or your global environment.`,
          );
        }),
      );
    } catch (error) {
      this.handleExecutionError(error, localModule);
    }

    this._isCurrentlyExecutingManualMock = origCurrExecutingManualMock;
    this._currentlyExecutingModulePath = lastExecutingModulePath;
  }

  private createScriptFromCode(scriptSource: string, filename: string) {
    try {
      return new Script(this.wrapCodeInModuleWrapper(scriptSource), {
        displayErrors: true,
        filename: this._resolver.isCoreModule(filename)
          ? `jest-nodejs-core-${filename}`
          : filename,
      });
    } catch (e) {
      throw handlePotentialSyntaxError(e);
    }
  }

  private _requireCoreModule(moduleName: string) {
    if (moduleName === 'process') {
      return this._environment.global.process;
    }

    if (moduleName === 'module') {
      return this._getMockedNativeModule();
    }

    return require(moduleName);
  }

  private _getMockedNativeModule(): typeof nativeModule.Module {
    if (this._moduleImplementation) {
      return this._moduleImplementation;
    }

    const createRequire = (modulePath: string | URL) => {
      const filename =
        typeof modulePath === 'string'
          ? modulePath.startsWith('file:///')
            ? fileURLToPath(new URL(modulePath))
            : modulePath
          : fileURLToPath(modulePath);

      if (!path.isAbsolute(filename)) {
        const error = new TypeError(
          `The argument 'filename' must be a file URL object, file URL string, or absolute path string. Received '${filename}'`,
        );
        // @ts-ignore
        error.code = 'ERR_INVALID_ARG_TYPE';
        throw error;
      }

      return this._createRequireImplementation({
        children: [],
        exports: {},
        filename,
        id: filename,
        loaded: false,
      });
    };

    // should we implement the class ourselves?
    class Module extends nativeModule.Module {}

    Module.Module = Module;

    if ('createRequire' in nativeModule) {
      Module.createRequire = createRequire;
    }
    if ('createRequireFromPath' in nativeModule) {
      Module.createRequireFromPath = (filename: string | URL) => {
        if (typeof filename !== 'string') {
          const error = new TypeError(
            `The argument 'filename' must be string. Received '${filename}'.${
              filename instanceof URL
                ? ' Use createRequire for URL filename.'
                : ''
            }`,
          );
          // @ts-ignore
          error.code = 'ERR_INVALID_ARG_TYPE';
          throw error;
        }
        return createRequire(filename);
      };
    }
    if ('syncBuiltinESMExports' in nativeModule) {
      Module.syncBuiltinESMExports = () => {};
    }

    this._moduleImplementation = Module;

    return Module;
  }

  private _generateMock(from: Config.Path, moduleName: string) {
    const modulePath =
      this._resolver.resolveStubModuleName(from, moduleName) ||
      this._resolveModule(from, moduleName);
    if (!(modulePath in this._mockMetaDataCache)) {
      // This allows us to handle circular dependencies while generating an
      // automock

      this._mockMetaDataCache[modulePath] =
        this._moduleMocker.getMetadata({}) || {};

      // In order to avoid it being possible for automocking to potentially
      // cause side-effects within the module environment, we need to execute
      // the module in isolation. This could cause issues if the module being
      // mocked has calls into side-effectful APIs on another module.
      const origMockRegistry = this._mockRegistry;
      const origModuleRegistry = this._moduleRegistry;
      this._mockRegistry = new Map();
      this._moduleRegistry = new Map();

      const moduleExports = this.requireModule(from, moduleName);

      // Restore the "real" module/mock registries
      this._mockRegistry = origMockRegistry;
      this._moduleRegistry = origModuleRegistry;

      const mockMetadata = this._moduleMocker.getMetadata(moduleExports);
      if (mockMetadata == null) {
        throw new Error(
          `Failed to get mock metadata: ${modulePath}\n\n` +
            `See: https://jestjs.io/docs/manual-mocks.html#content`,
        );
      }
      this._mockMetaDataCache[modulePath] = mockMetadata;
    }
    return this._moduleMocker.generateFromMetadata(
      this._mockMetaDataCache[modulePath],
    );
  }

  private _shouldMock(from: Config.Path, moduleName: string) {
    const explicitShouldMock = this._explicitShouldMock;
    const moduleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
      moduleName,
    );
    const key = from + path.delimiter + moduleID;

    if (moduleID in explicitShouldMock) {
      return explicitShouldMock[moduleID];
    }

    if (
      !this._shouldAutoMock ||
      this._resolver.isCoreModule(moduleName) ||
      this._shouldUnmockTransitiveDependenciesCache[key]
    ) {
      return false;
    }

    if (moduleID in this._shouldMockModuleCache) {
      return this._shouldMockModuleCache[moduleID];
    }

    let modulePath;
    try {
      modulePath = this._resolveModule(from, moduleName);
    } catch (e) {
      const manualMock = this._resolver.getMockModule(from, moduleName);
      if (manualMock) {
        this._shouldMockModuleCache[moduleID] = true;
        return true;
      }
      throw e;
    }

    if (this._unmockList && this._unmockList.test(modulePath)) {
      this._shouldMockModuleCache[moduleID] = false;
      return false;
    }

    // transitive unmocking for package managers that store flat packages (npm3)
    const currentModuleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
    );
    if (
      this._transitiveShouldMock[currentModuleID] === false ||
      (from.includes(NODE_MODULES) &&
        modulePath.includes(NODE_MODULES) &&
        ((this._unmockList && this._unmockList.test(from)) ||
          explicitShouldMock[currentModuleID] === false))
    ) {
      this._transitiveShouldMock[moduleID] = false;
      this._shouldUnmockTransitiveDependenciesCache[key] = true;
      return false;
    }

    return (this._shouldMockModuleCache[moduleID] = true);
  }

  private _createRequireImplementation(
    from: InitialModule,
    options?: InternalModuleOptions,
  ): LocalModuleRequire {
    // TODO: somehow avoid having to type the arguments - they should come from `NodeRequire/LocalModuleRequire.resolve`
    const resolve = (moduleName: string, options: ResolveOptions) =>
      this._requireResolve(from.filename, moduleName, options);
    resolve.paths = (moduleName: string) =>
      this._requireResolvePaths(from.filename, moduleName);

    const moduleRequire = (options && options.isInternalModule
      ? (moduleName: string) =>
          this.requireInternalModule(from.filename, moduleName)
      : this.requireModuleOrMock.bind(
          this,
          from.filename,
        )) as LocalModuleRequire;
    moduleRequire.cache = Object.create(null);
    moduleRequire.extensions = Object.create(null);
    moduleRequire.requireActual = this.requireActual.bind(this, from.filename);
    moduleRequire.requireMock = this.requireMock.bind(this, from.filename);
    moduleRequire.resolve = resolve;

    Object.defineProperty(moduleRequire, 'main', {
      enumerable: true,
      get() {
        let mainModule = from.parent;
        while (
          mainModule &&
          mainModule.parent &&
          mainModule.id !== mainModule.parent.id
        ) {
          mainModule = mainModule.parent;
        }
        return mainModule;
      },
    });
    return moduleRequire;
  }

  private _createJestObjectFor(
    from: Config.Path,
    localRequire: LocalModuleRequire,
  ): Jest {
    const disableAutomock = () => {
      this._shouldAutoMock = false;
      return jestObject;
    };
    const enableAutomock = () => {
      this._shouldAutoMock = true;
      return jestObject;
    };
    const unmock = (moduleName: string) => {
      const moduleID = this._resolver.getModuleID(
        this._virtualMocks,
        from,
        moduleName,
      );
      this._explicitShouldMock[moduleID] = false;
      return jestObject;
    };
    const deepUnmock = (moduleName: string) => {
      const moduleID = this._resolver.getModuleID(
        this._virtualMocks,
        from,
        moduleName,
      );
      this._explicitShouldMock[moduleID] = false;
      this._transitiveShouldMock[moduleID] = false;
      return jestObject;
    };
    const mock: Jest['mock'] = (moduleName, mockFactory, options) => {
      if (mockFactory !== undefined) {
        return setMockFactory(moduleName, mockFactory, options);
      }

      const moduleID = this._resolver.getModuleID(
        this._virtualMocks,
        from,
        moduleName,
      );
      this._explicitShouldMock[moduleID] = true;
      return jestObject;
    };
    const setMockFactory = (
      moduleName: string,
      mockFactory: () => unknown,
      options?: {virtual?: boolean},
    ) => {
      this.setMock(from, moduleName, mockFactory, options);
      return jestObject;
    };
    const clearAllMocks = () => {
      this.clearAllMocks();
      return jestObject;
    };
    const resetAllMocks = () => {
      this.resetAllMocks();
      return jestObject;
    };
    const restoreAllMocks = () => {
      this.restoreAllMocks();
      return jestObject;
    };
    const useFakeTimers = () => {
      _getFakeTimers().useFakeTimers();
      return jestObject;
    };
    const useRealTimers = () => {
      _getFakeTimers().useRealTimers();
      return jestObject;
    };
    const resetModules = () => {
      this.resetModules();
      return jestObject;
    };
    const isolateModules = (fn: () => void) => {
      this.isolateModules(fn);
      return jestObject;
    };
    const fn = this._moduleMocker.fn.bind(this._moduleMocker);
    const spyOn = this._moduleMocker.spyOn.bind(this._moduleMocker);

    const setTimeout = (timeout: number) => {
      if (this._environment.global.jasmine) {
        this._environment.global.jasmine._DEFAULT_TIMEOUT_INTERVAL = timeout;
      } else {
        // @ts-ignore: https://github.com/Microsoft/TypeScript/issues/24587
        this._environment.global[testTimeoutSymbol] = timeout;
      }
      return jestObject;
    };

    const retryTimes = (numTestRetries: number) => {
      // @ts-ignore: https://github.com/Microsoft/TypeScript/issues/24587
      this._environment.global[retryTimesSymbol] = numTestRetries;
      return jestObject;
    };

    const _getFakeTimers = (): NonNullable<JestEnvironment['fakeTimers']> => {
      if (!this._environment.fakeTimers) {
        this._logFormattedReferenceError(
          'You are trying to access a property or method of the Jest environment after it has been torn down.',
        );
        process.exitCode = 1;
      }

      // We've logged a user message above, so it doesn't matter if we return `null` here
      return this._environment.fakeTimers!;
    };

    const jestObject: Jest = {
      addMatchers: (matchers: Record<string, any>) =>
        this._environment.global.jasmine.addMatchers(matchers),
      advanceTimersByTime: (msToRun: number) =>
        _getFakeTimers().advanceTimersByTime(msToRun),
      advanceTimersToNextTimer: (steps?: number) =>
        _getFakeTimers().advanceTimersToNextTimer(steps),
      autoMockOff: disableAutomock,
      autoMockOn: enableAutomock,
      clearAllMocks,
      clearAllTimers: () => _getFakeTimers().clearAllTimers(),
      deepUnmock,
      disableAutomock,
      doMock: mock,
      dontMock: unmock,
      enableAutomock,
      fn,
      genMockFromModule: (moduleName: string) =>
        this._generateMock(from, moduleName),
      getTimerCount: () => _getFakeTimers().getTimerCount(),
      isMockFunction: this._moduleMocker.isMockFunction,
      isolateModules,
      mock,
      requireActual: localRequire.requireActual,
      requireMock: localRequire.requireMock,
      resetAllMocks,
      resetModuleRegistry: resetModules,
      resetModules,
      restoreAllMocks,
      retryTimes,
      runAllImmediates: () => _getFakeTimers().runAllImmediates(),
      runAllTicks: () => _getFakeTimers().runAllTicks(),
      runAllTimers: () => _getFakeTimers().runAllTimers(),
      runOnlyPendingTimers: () => _getFakeTimers().runOnlyPendingTimers(),
      runTimersToTime: (msToRun: number) =>
        _getFakeTimers().advanceTimersByTime(msToRun),
      setMock: (moduleName: string, mock: unknown) =>
        setMockFactory(moduleName, () => mock),
      setTimeout,
      spyOn,
      unmock,
      useFakeTimers,
      useRealTimers,
    };
    return jestObject;
  }

  private _logFormattedReferenceError(errorMessage: string) {
    const originalStack = new ReferenceError(errorMessage)
      .stack!.split('\n')
      // Remove this file from the stack (jest-message-utils will keep one line)
      .filter(line => line.indexOf(__filename) === -1)
      .join('\n');

    const {message, stack} = separateMessageFromStack(originalStack);

    console.error(
      `\n${message}\n` +
        formatStackTrace(stack, this._config, {noStackTrace: false}),
    );
  }

  private wrapCodeInModuleWrapper(content: string) {
    const args = this.constructInjectedModuleParameters();

    return (
      '({"' +
      EVAL_RESULT_VARIABLE +
      `":function(${args.join(',')}){` +
      content +
      '\n}});'
    );
  }

  private constructInjectedModuleParameters() {
    return [
      'module',
      'exports',
      'require',
      '__dirname',
      '__filename',
      'global',
      'jest',
      ...this._config.extraGlobals,
    ];
  }

  private handleExecutionError(e: Error, module: InitialModule): never {
    const moduleNotFoundError = Resolver.tryCastModuleNotFoundError(e);
    if (moduleNotFoundError) {
      if (!moduleNotFoundError.requireStack) {
        moduleNotFoundError.requireStack = [module.filename || module.id];

        for (let cursor = module.parent; cursor; cursor = cursor.parent) {
          moduleNotFoundError.requireStack.push(cursor.filename || cursor.id);
        }

        moduleNotFoundError.buildMessage(this._config.rootDir);
      }
      throw moduleNotFoundError;
    }

    throw e;
  }

  private getGlobalsForFile(from: Config.Path): JestGlobalsValues {
    const jest = this.jestObjectCaches.get(from);

    invariant(jest, 'There should always be a Jest object already');

    return {
      afterAll: this._environment.global.afterAll,
      afterEach: this._environment.global.afterEach,
      beforeAll: this._environment.global.beforeAll,
      beforeEach: this._environment.global.beforeEach,
      describe: this._environment.global.describe,
      expect: this._environment.global.expect,
      fdescribe: this._environment.global.fdescribe,
      fit: this._environment.global.fit,
      it: this._environment.global.it,
      jest,
      test: this._environment.global.test,
      xdescribe: this._environment.global.xdescribe,
      xit: this._environment.global.xit,
      xtest: this._environment.global.xtest,
    };
  }
}

function invariant(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export = Runtime;
