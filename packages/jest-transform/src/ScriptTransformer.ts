/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createHash} from 'crypto';
import * as path from 'path';
import {transformSync as babelTransform} from '@babel/core';
// @ts-expect-error: should just be `require.resolve`, but the tests mess that up
import babelPluginIstanbul from 'babel-plugin-istanbul';
import {fromSource as sourcemapFromSource} from 'convert-source-map';
import stableStringify = require('fast-json-stable-stringify');
import * as fs from 'graceful-fs';
import {addHook} from 'pirates';
import slash = require('slash');
import {sync as writeFileAtomic} from 'write-file-atomic';
import type {Config} from '@jest/types';
import HasteMap = require('jest-haste-map');
import {
  createDirectory,
  interopRequireDefault,
  isPromise,
  tryRealpath,
} from 'jest-util';
import handlePotentialSyntaxError from './enhanceUnexpectedTokenMessage';
import shouldInstrument from './shouldInstrument';
import type {
  AsyncTransformer,
  Options,
  SyncTransformer,
  TransformOptions,
  TransformResult,
  TransformedSource,
  Transformer,
} from './types';
// Use `require` to avoid TS rootDir
const {version: VERSION} = require('../package.json');

type ProjectCache = {
  configString: string;
  ignorePatternsRegExp?: RegExp;
  transformRegExp?: Array<[RegExp, string, Record<string, unknown>]>;
  transformedFiles: Map<string, TransformResult>;
};

// This data structure is used to avoid recalculating some data every time that
// we need to transform a file. Since ScriptTransformer is instantiated for each
// file we need to keep this object in the local scope of this module.
const projectCaches = new Map<string, ProjectCache>();

// To reset the cache for specific changesets (rather than package version).
const CACHE_VERSION = '1';

async function waitForPromiseWithCleanup(
  promise: Promise<unknown>,
  cleanup: () => void,
) {
  try {
    await promise;
  } finally {
    cleanup();
  }
}

export default class ScriptTransformer {
  private _cache: ProjectCache;
  private _config: Config.ProjectConfig;
  private _transformCache: Map<Config.Path, Transformer>;
  private _transformConfigCache: Map<Config.Path, unknown>;

  constructor(config: Config.ProjectConfig) {
    this._config = config;
    this._transformCache = new Map();
    this._transformConfigCache = new Map();

    const configString = stableStringify(this._config);
    let projectCache = projectCaches.get(configString);

    if (!projectCache) {
      projectCache = {
        configString,
        ignorePatternsRegExp: calcIgnorePatternRegExp(this._config),
        transformRegExp: calcTransformRegExp(this._config),
        transformedFiles: new Map(),
      };

      projectCaches.set(configString, projectCache);
    }

    this._cache = projectCache;
  }

  private _buildCacheKeyFromFileInfo(
    fileData: string,
    filename: Config.Path,
    instrument: boolean,
    configString: string,
    transformerCacheKey?: string,
  ): string {
    if (transformerCacheKey) {
      return createHash('md5')
        .update(transformerCacheKey)
        .update(CACHE_VERSION)
        .digest('hex');
    } else {
      return createHash('md5')
        .update(fileData)
        .update(configString)
        .update(instrument ? 'instrument' : '')
        .update(filename)
        .update(CACHE_VERSION)
        .digest('hex');
    }
  }

  private _getCacheKey(
    content: string,
    filename: Config.Path,
    options: TransformOptions,
  ): string {
    const configString = this._cache.configString;
    const transformer = this._getTransformer(filename);
    let transformerCacheKey = undefined;

    if (transformer && typeof transformer.getCacheKey === 'function') {
      transformerCacheKey = transformer.getCacheKey(
        content,
        filename,
        configString,
        {
          config: this._config,
          instrument: options.instrument,
          rootDir: this._config.rootDir,
          supportsDynamicImport: options.supportsDynamicImport,
          supportsExportNamespaceFrom: options.supportsExportNamespaceFrom,
          supportsStaticESM: options.supportsStaticESM,
          supportsTopLevelAwait: options.supportsTopLevelAwait,
        },
      );
    }
    return this._buildCacheKeyFromFileInfo(
      content,
      filename,
      options.instrument,
      configString,
      transformerCacheKey,
    );
  }

  private async _getCacheKeyAsync(
    content: string,
    filename: Config.Path,
    options: TransformOptions,
  ): Promise<string> {
    const configString = this._cache.configString;
    const transformer = await this._getTransformerAsync(filename);
    let transformerCacheKey = undefined;

    if (transformer && typeof transformer.getCacheKeyAsync === 'function') {
      transformerCacheKey = await transformer.getCacheKeyAsync(
        content,
        filename,
        configString,
        {
          config: this._config,
          instrument: options.instrument,
          rootDir: this._config.rootDir,
          supportsDynamicImport: options.supportsDynamicImport,
          supportsExportNamespaceFrom: options.supportsExportNamespaceFrom,
          supportsStaticESM: options.supportsStaticESM,
          supportsTopLevelAwait: options.supportsTopLevelAwait,
        },
      );
    }
    return this._buildCacheKeyFromFileInfo(
      content,
      filename,
      options.instrument,
      configString,
      transformerCacheKey,
    );
  }

  private _createFolderFromCacheKey(
    filename: Config.Path,
    cacheKey: string,
  ): string {
    const baseCacheDir = HasteMap.getCacheFilePath(
      this._config.cacheDirectory,
      'jest-transform-cache-' + this._config.name,
      VERSION,
    );
    // Create sub folders based on the cacheKey to avoid creating one
    // directory with many files.
    const cacheDir = path.join(baseCacheDir, cacheKey[0] + cacheKey[1]);
    const cacheFilenamePrefix = path
      .basename(filename, path.extname(filename))
      .replace(/\W/g, '');
    const cachePath = slash(
      path.join(cacheDir, cacheFilenamePrefix + '_' + cacheKey),
    );
    createDirectory(cacheDir);

    return cachePath;
  }

  private _getFileCachePath(
    filename: Config.Path,
    content: string,
    options: TransformOptions,
  ): Config.Path {
    const cacheKey = this._getCacheKey(content, filename, options);

    return this._createFolderFromCacheKey(filename, cacheKey);
  }

  private async _getFileCachePathAsync(
    filename: Config.Path,
    content: string,
    options: TransformOptions,
  ): Promise<Config.Path> {
    const cacheKey = await this._getCacheKeyAsync(content, filename, options);

    return this._createFolderFromCacheKey(filename, cacheKey);
  }

  private _getTransformPath(filename: Config.Path) {
    const transformRegExp = this._cache.transformRegExp;
    if (!transformRegExp) {
      return undefined;
    }

    for (let i = 0; i < transformRegExp.length; i++) {
      if (transformRegExp[i][0].test(filename)) {
        const transformPath = transformRegExp[i][1];
        this._transformConfigCache.set(transformPath, transformRegExp[i][2]);

        return transformPath;
      }
    }

    return undefined;
  }

  private async _getTransformerAsync(filename: Config.Path) {
    let transform: AsyncTransformer | null = null;
    if (!this._config.transform || !this._config.transform.length) {
      return null;
    }

    const transformPath = this._getTransformPath(filename);
    if (transformPath) {
      const transformer = this._transformCache.get(transformPath);
      if (transformer != null) {
        return transformer;
      }

      transform = require(transformPath);

      if (!transform) {
        throw new TypeError('Jest: a transform must export something.');
      }
      const transformerConfig = this._transformConfigCache.get(transformPath);
      if (typeof transform.createTransformer === 'function') {
        transform = transform.createTransformer(transformerConfig);
      }
      if (
        typeof transform.process !== 'function' &&
        typeof transform.processAsync !== 'function'
      ) {
        throw new TypeError(
          'Jest: a transform must export a `process` or `processAsync` function.',
        );
      }
      this._transformCache.set(transformPath, transform);
    }
    return transform;
  }

  private _getTransformer(filename: Config.Path) {
    if (!this._config.transform || !this._config.transform.length) {
      return null;
    }

    const transformPath = this._getTransformPath(filename);

    if (!transformPath) {
      return null;
    }

    const transformer = this._transformCache.get(transformPath);
    if (transformer) {
      return transformer;
    }

    let transform: SyncTransformer = require(transformPath);

    if (!transform) {
      throw new TypeError('Jest: a transform must export something.');
    }
    const transformerConfig = this._transformConfigCache.get(transformPath);
    if (typeof transform.createTransformer === 'function') {
      transform = transform.createTransformer(transformerConfig);
    }
    if (typeof transform.process !== 'function') {
      throw new TypeError(
        'Jest: a transform must export a `process` function.',
      );
    }
    this._transformCache.set(transformPath, transform);

    return transform;
  }

  private _instrumentFile(
    filename: Config.Path,
    input: TransformedSource,
    canMapToInput: boolean,
    options: TransformOptions,
  ): TransformedSource {
    const inputCode = typeof input === 'string' ? input : input.code;
    const inputMap = typeof input === 'string' ? null : input.map;

    const result = babelTransform(inputCode, {
      auxiliaryCommentBefore: ' istanbul ignore next ',
      babelrc: false,
      caller: {
        name: '@jest/transform',
        supportsDynamicImport: options.supportsDynamicImport,
        supportsExportNamespaceFrom: options.supportsExportNamespaceFrom,
        supportsStaticESM: options.supportsStaticESM,
        supportsTopLevelAwait: options.supportsTopLevelAwait,
      },
      configFile: false,
      filename,
      plugins: [
        [
          babelPluginIstanbul,
          {
            compact: false,
            // files outside `cwd` will not be instrumented
            cwd: this._config.rootDir,
            exclude: [],
            extension: false,
            inputSourceMap: inputMap,
            useInlineSourceMaps: false,
          },
        ],
      ],
      sourceMaps: canMapToInput ? 'both' : false,
    });

    if (result && result.code) {
      return result as TransformResult;
    }

    return input;
  }

  // We don't want to expose transformers to the outside - this function is just
  // to warm up `this._transformCache`
  preloadTransformer(filepath: Config.Path): void {
    this._getTransformer(filepath);
  }

  private _buildTransformResult(
    filename: string,
    cacheFilePath: string,
    content: string,
    transform: Transformer | null,
    shouldCallTransform: boolean | null | undefined,
    options: TransformOptions,
    processed: TransformedSource | null,
    sourceMapPath: Config.Path | null,
  ): TransformResult {
    let transformed: TransformedSource = {
      code: content,
      map: null,
    };

    if (transform && shouldCallTransform) {
      if (typeof processed === 'string') {
        transformed.code = processed;
      } else if (processed != null && typeof processed.code === 'string') {
        transformed = processed;
      } else {
        throw new TypeError(
          "Jest: a transform's `process` function must return a string, " +
            'or an object with `code` key containing this string. ' +
            "It's `processAsync` function must return that in a promise.",
        );
      }
    }

    if (!transformed.map) {
      try {
        //Could be a potential freeze here.
        //See: https://github.com/facebook/jest/pull/5177#discussion_r158883570
        const inlineSourceMap = sourcemapFromSource(transformed.code);
        if (inlineSourceMap) {
          transformed.map = inlineSourceMap.toObject();
        }
      } catch {
        const transformPath = this._getTransformPath(filename);
        console.warn(
          `jest-transform: The source map produced for the file ${filename} ` +
            `by ${transformPath} was invalid. Proceeding without source ` +
            'mapping for that file.',
        );
      }
    }

    // That means that the transform has a custom instrumentation
    // logic and will handle it based on `config.collectCoverage` option
    const transformWillInstrument =
      shouldCallTransform && transform && transform.canInstrument;

    // Apply instrumentation to the code if necessary, keeping the instrumented code and new map
    let map = transformed.map;
    let code;
    if (!transformWillInstrument && options.instrument) {
      /**
       * We can map the original source code to the instrumented code ONLY if
       * - the process of transforming the code produced a source map e.g. ts-jest
       * - we did not transform the source code
       *
       * Otherwise we cannot make any statements about how the instrumented code corresponds to the original code,
       * and we should NOT emit any source maps
       *
       */
      const shouldEmitSourceMaps =
        (transform != null && map != null) || transform == null;

      const instrumented = this._instrumentFile(
        filename,
        transformed,
        shouldEmitSourceMaps,
        options,
      );

      code =
        typeof instrumented === 'string' ? instrumented : instrumented.code;
      map = typeof instrumented === 'string' ? null : instrumented.map;
    } else {
      code = transformed.code;
    }

    if (map) {
      const sourceMapContent =
        typeof map === 'string' ? map : JSON.stringify(map);

      invariant(sourceMapPath, 'We should always have default sourceMapPath');

      writeCacheFile(sourceMapPath, sourceMapContent);
    } else {
      sourceMapPath = null;
    }

    writeCodeCacheFile(cacheFilePath, code);

    return {
      code,
      originalCode: content,
      sourceMapPath,
    };
  }

  // TODO: replace third argument with TransformOptions in Jest 26
  transformSource(
    filepath: Config.Path,
    content: string,
    options: TransformOptions,
  ): TransformResult {
    const filename = tryRealpath(filepath);
    const transform = this._getTransformer(filename);
    const cacheFilePath = this._getFileCachePath(filename, content, options);
    const sourceMapPath: Config.Path | null = cacheFilePath + '.map';
    // Ignore cache if `config.cache` is set (--no-cache)
    const code = this._config.cache ? readCodeCacheFile(cacheFilePath) : null;

    const shouldCallTransform = transform && this.shouldTransform(filename);

    if (code) {
      // This is broken: we return the code, and a path for the source map
      // directly from the cache. But, nothing ensures the source map actually
      // matches that source code. They could have gotten out-of-sync in case
      // two separate processes write concurrently to the same cache files.
      return {
        code,
        originalCode: content,
        sourceMapPath,
      };
    }

    let processed: TransformedSource | null = null;
    if (transform && shouldCallTransform) {
      if (typeof transform.process !== 'function') {
        throw new TypeError(
          'Jest: a synchronous transform mus export a `process` function.',
        );
      }

      processed = transform.process(content, filename, this._config, options);

      if (
        processed == null ||
        (typeof processed !== 'string' && typeof processed.code !== 'string')
      ) {
        throw new TypeError(
          "Jest: a transform's `process` function must return a string, " +
            'or an object with `code` key containing this string.',
        );
      }
    }

    return this._buildTransformResult(
      filename,
      cacheFilePath,
      content,
      transform,
      shouldCallTransform,
      options,
      processed,
      sourceMapPath,
    );
  }

  // TODO: replace third argument with TransformOptions in Jest 26
  async transformSourceAsync(
    filepath: Config.Path,
    content: string,
    options: TransformOptions,
  ): Promise<TransformResult> {
    const filename = tryRealpath(filepath);
    const transform = await this._getTransformerAsync(filename);
    const cacheFilePath = await this._getFileCachePathAsync(
      filename,
      content,
      options,
    );
    const sourceMapPath: Config.Path | null = cacheFilePath + '.map';
    // Ignore cache if `config.cache` is set (--no-cache)
    const code = this._config.cache ? readCodeCacheFile(cacheFilePath) : null;

    const shouldCallTransform = transform && this.shouldTransform(filename);

    if (code) {
      // This is broken: we return the code, and a path for the source map
      // directly from the cache. But, nothing ensures the source map actually
      // matches that source code. They could have gotten out-of-sync in case
      // two separate processes write concurrently to the same cache files.
      return {
        code,
        originalCode: content,
        sourceMapPath,
      };
    }

    let processed: TransformedSource | null = null;

    if (transform && shouldCallTransform) {
      if (transform.processAsync) {
        processed = await transform.processAsync(
          content,
          filename,
          this._config,
          options,
        );
      } else if (transform.process) {
        processed = transform.process(content, filename, this._config, options);
      }

      if (
        processed == null ||
        (typeof processed !== 'string' && typeof processed.code !== 'string')
      ) {
        throw new TypeError(
          "Jest: a transform's `process` function must return a string, " +
            'or an object with `code` key containing this string. ' +
            "It's `processAsync` function must return that in a promise.",
        );
      }
    }

    return this._buildTransformResult(
      filename,
      cacheFilePath,
      content,
      transform,
      shouldCallTransform,
      options,
      processed,
      sourceMapPath,
    );
  }

  private async _transformAndBuildScriptAsync(
    filename: Config.Path,
    options: Options,
    transformOptions: TransformOptions,
    fileSource?: string,
  ): Promise<TransformResult> {
    const {isCoreModule, isInternalModule} = options;
    const content = stripShebang(
      fileSource || fs.readFileSync(filename, 'utf8'),
    );

    let code = content;
    let sourceMapPath: string | null = null;

    const willTransform =
      !isInternalModule &&
      !isCoreModule &&
      (transformOptions.instrument || this.shouldTransform(filename));

    try {
      if (willTransform) {
        const transformedSource = await this.transformSourceAsync(
          filename,
          content,
          transformOptions,
        );

        code = transformedSource.code;
        sourceMapPath = transformedSource.sourceMapPath;
      }

      return {
        code,
        originalCode: content,
        sourceMapPath,
      };
    } catch (e) {
      throw handlePotentialSyntaxError(e);
    }
  }

  private _transformAndBuildScript(
    filename: Config.Path,
    options: Options,
    transformOptions: TransformOptions,
    fileSource?: string,
  ): TransformResult {
    const {isCoreModule, isInternalModule} = options;
    const content = stripShebang(
      fileSource || fs.readFileSync(filename, 'utf8'),
    );

    let code = content;
    let sourceMapPath: string | null = null;

    const willTransform =
      !isInternalModule &&
      !isCoreModule &&
      (transformOptions.instrument || this.shouldTransform(filename));

    try {
      if (willTransform) {
        const transformedSource = this.transformSource(
          filename,
          content,
          transformOptions,
        );

        code = transformedSource.code;
        sourceMapPath = transformedSource.sourceMapPath;
      }

      return {
        code,
        originalCode: content,
        sourceMapPath,
      };
    } catch (e) {
      throw handlePotentialSyntaxError(e);
    }
  }

  async transformAsync(
    filename: Config.Path,
    options: Options,
    fileSource?: string,
  ): Promise<TransformResult> {
    let scriptCacheKey = undefined;
    let instrument = false;

    if (!options.isCoreModule) {
      instrument =
        options.coverageProvider === 'babel' &&
        shouldInstrument(filename, options, this._config);
      scriptCacheKey = getScriptCacheKey(filename, instrument);
      const result = this._cache.transformedFiles.get(scriptCacheKey);
      if (result) {
        return result;
      }
    }

    const result = await this._transformAndBuildScriptAsync(
      filename,
      options,
      {...options, instrument},
      fileSource,
    );

    if (scriptCacheKey) {
      this._cache.transformedFiles.set(scriptCacheKey, result);
    }

    return result;
  }

  transform(
    filename: Config.Path,
    options: Options,
    fileSource?: string,
  ): TransformResult {
    let scriptCacheKey = undefined;
    let instrument = false;

    if (!options.isCoreModule) {
      instrument =
        options.coverageProvider === 'babel' &&
        shouldInstrument(filename, options, this._config);
      scriptCacheKey = getScriptCacheKey(filename, instrument);
      const result = this._cache.transformedFiles.get(scriptCacheKey);
      if (result) {
        return result;
      }
    }

    const result = this._transformAndBuildScript(
      filename,
      options,
      {...options, instrument},
      fileSource,
    );

    if (scriptCacheKey) {
      this._cache.transformedFiles.set(scriptCacheKey, result);
    }

    return result;
  }

  transformJson(
    filename: Config.Path,
    options: Options,
    fileSource: string,
  ): string {
    const {isCoreModule, isInternalModule} = options;
    const willTransform =
      !isInternalModule && !isCoreModule && this.shouldTransform(filename);

    if (willTransform) {
      const {code: transformedJsonSource} = this.transformSource(
        filename,
        fileSource,
        {...options, instrument: false},
      );
      return transformedJsonSource;
    }

    return fileSource;
  }

  requireAndTranspileModule<ModuleType = unknown>(
    moduleName: string,
    callback?: (module: ModuleType) => void,
    transformOptions?: TransformOptions,
  ): ModuleType;
  requireAndTranspileModule<ModuleType = unknown>(
    moduleName: string,
    callback?: (module: ModuleType) => Promise<void>,
    transformOptions?: TransformOptions,
  ): Promise<ModuleType>;
  requireAndTranspileModule<ModuleType = unknown>(
    moduleName: string,
    callback?: (module: ModuleType) => void | Promise<void>,
    transformOptions: TransformOptions = {instrument: false},
  ): ModuleType | Promise<ModuleType> {
    // Load the transformer to avoid a cycle where we need to load a
    // transformer in order to transform it in the require hooks
    this.preloadTransformer(moduleName);

    let transforming = false;
    const revertHook = addHook(
      (code, filename) => {
        try {
          transforming = true;
          return (
            this.transformSource(filename, code, transformOptions).code || code
          );
        } finally {
          transforming = false;
        }
      },
      {
        exts: this._config.moduleFileExtensions.map(ext => `.${ext}`),
        ignoreNodeModules: false,
        matcher: filename => {
          if (transforming) {
            // Don't transform any dependency required by the transformer itself
            return false;
          }
          return this.shouldTransform(filename);
        },
      },
    );
    const module: ModuleType = require(moduleName);

    if (!callback) {
      revertHook();

      return module;
    }

    try {
      const cbResult = callback(module);

      if (isPromise(cbResult)) {
        return waitForPromiseWithCleanup(cbResult, revertHook).then(
          () => module,
        );
      }
    } finally {
      revertHook();
    }

    return module;
  }

  shouldTransform(filename: Config.Path): boolean {
    const ignoreRegexp = this._cache.ignorePatternsRegExp;
    const isIgnored = ignoreRegexp ? ignoreRegexp.test(filename) : false;

    return (
      !!this._config.transform && !!this._config.transform.length && !isIgnored
    );
  }
}

// TODO: do we need to define the generics twice?
export function createTranspilingRequire(
  config: Config.ProjectConfig,
): <TModuleType = unknown>(
  resolverPath: string,
  applyInteropRequireDefault?: boolean,
) => TModuleType {
  const transformer = new ScriptTransformer(config);

  return function requireAndTranspileModule<TModuleType = unknown>(
    resolverPath: string,
    applyInteropRequireDefault: boolean = false,
  ): TModuleType {
    const transpiledModule = transformer.requireAndTranspileModule<TModuleType>(
      resolverPath,
    );

    return applyInteropRequireDefault
      ? interopRequireDefault(transpiledModule).default
      : transpiledModule;
  };
}

const removeFile = (path: Config.Path) => {
  try {
    fs.unlinkSync(path);
  } catch {}
};

const stripShebang = (content: string) => {
  // If the file data starts with a shebang remove it. Leaves the empty line
  // to keep stack trace line numbers correct.
  if (content.startsWith('#!')) {
    return content.replace(/^#!.*/, '');
  } else {
    return content;
  }
};

/**
 * This is like `writeCacheFile` but with an additional sanity checksum. We
 * cannot use the same technique for source maps because we expose source map
 * cache file paths directly to callsites, with the expectation they can read
 * it right away. This is not a great system, because source map cache file
 * could get corrupted, out-of-sync, etc.
 */
function writeCodeCacheFile(cachePath: Config.Path, code: string) {
  const checksum = createHash('md5').update(code).digest('hex');
  writeCacheFile(cachePath, checksum + '\n' + code);
}

/**
 * Read counterpart of `writeCodeCacheFile`. We verify that the content of the
 * file matches the checksum, in case some kind of corruption happened. This
 * could happen if an older version of `jest-runtime` writes non-atomically to
 * the same cache, for example.
 */
function readCodeCacheFile(cachePath: Config.Path): string | null {
  const content = readCacheFile(cachePath);
  if (content == null) {
    return null;
  }
  const code = content.substr(33);
  const checksum = createHash('md5').update(code).digest('hex');
  if (checksum === content.substr(0, 32)) {
    return code;
  }
  return null;
}

/**
 * Writing to the cache atomically relies on 'rename' being atomic on most
 * file systems. Doing atomic write reduces the risk of corruption by avoiding
 * two processes to write to the same file at the same time. It also reduces
 * the risk of reading a file that's being overwritten at the same time.
 */
const writeCacheFile = (cachePath: Config.Path, fileData: string) => {
  try {
    writeFileAtomic(cachePath, fileData, {encoding: 'utf8', fsync: false});
  } catch (e) {
    if (cacheWriteErrorSafeToIgnore(e, cachePath)) {
      return;
    }

    e.message =
      'jest: failed to cache transform results in: ' +
      cachePath +
      '\nFailure message: ' +
      e.message;
    removeFile(cachePath);
    throw e;
  }
};

/**
 * On Windows, renames are not atomic, leading to EPERM exceptions when two
 * processes attempt to rename to the same target file at the same time.
 * If the target file exists we can be reasonably sure another process has
 * legitimately won a cache write race and ignore the error.
 */
const cacheWriteErrorSafeToIgnore = (
  e: Error & {code: string},
  cachePath: Config.Path,
) =>
  process.platform === 'win32' &&
  e.code === 'EPERM' &&
  fs.existsSync(cachePath);

const readCacheFile = (cachePath: Config.Path): string | null => {
  if (!fs.existsSync(cachePath)) {
    return null;
  }

  let fileData;
  try {
    fileData = fs.readFileSync(cachePath, 'utf8');
  } catch (e) {
    e.message =
      'jest: failed to read cache file: ' +
      cachePath +
      '\nFailure message: ' +
      e.message;
    removeFile(cachePath);
    throw e;
  }

  if (fileData == null) {
    // We must have somehow created the file but failed to write to it,
    // let's delete it and retry.
    removeFile(cachePath);
  }
  return fileData;
};

const getScriptCacheKey = (filename: Config.Path, instrument: boolean) => {
  const mtime = fs.statSync(filename).mtime;
  return filename + '_' + mtime.getTime() + (instrument ? '_instrumented' : '');
};

const calcIgnorePatternRegExp = (config: Config.ProjectConfig) => {
  if (
    !config.transformIgnorePatterns ||
    config.transformIgnorePatterns.length === 0
  ) {
    return undefined;
  }

  return new RegExp(config.transformIgnorePatterns.join('|'));
};

const calcTransformRegExp = (config: Config.ProjectConfig) => {
  if (!config.transform.length) {
    return undefined;
  }

  const transformRegexp: Array<[RegExp, string, Record<string, unknown>]> = [];
  for (let i = 0; i < config.transform.length; i++) {
    transformRegexp.push([
      new RegExp(config.transform[i][0]),
      config.transform[i][1],
      config.transform[i][2],
    ]);
  }

  return transformRegexp;
};

function invariant(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
