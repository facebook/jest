/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import crypto from 'crypto';
import path from 'path';
import vm from 'vm';
import {Config} from '@jest/types';
import {createDirectory} from 'jest-util';
import fs from 'graceful-fs';
import {transformSync as babelTransform} from '@babel/core';
// @ts-ignore: should just be `require.resolve`, but the tests mess that up
import babelPluginIstanbul from 'babel-plugin-istanbul';
import convertSourceMap from 'convert-source-map';
import HasteMap from 'jest-haste-map';
import stableStringify from 'fast-json-stable-stringify';
import slash from 'slash';
import writeFileAtomic from 'write-file-atomic';
import {sync as realpath} from 'realpath-native';
import {
  Options,
  Transformer,
  TransformedSource,
  TransformResult,
} from './types';
import shouldInstrument from './shouldInstrument';
import enhanceUnexpectedTokenMessage from './enhanceUnexpectedTokenMessage';

type ProjectCache = {
  configString: string;
  ignorePatternsRegExp?: RegExp;
  transformRegExp?: Array<[RegExp, string]>;
  transformedFiles: Map<string, TransformResult>;
};

// Use `require` to avoid TS rootDir
const {version: VERSION} = require('../package.json');

// This data structure is used to avoid recalculating some data every time that
// we need to transform a file. Since ScriptTransformer is instantiated for each
// file we need to keep this object in the local scope of this module.
const projectCaches: WeakMap<
  Config.ProjectConfig,
  ProjectCache
> = new WeakMap();

// To reset the cache for specific changesets (rather than package version).
const CACHE_VERSION = '1';

export default class ScriptTransformer {
  static EVAL_RESULT_VARIABLE: 'Object.<anonymous>';
  private _cache: ProjectCache;
  private _config: Config.ProjectConfig;
  private _transformCache: Map<Config.Path, Transformer>;

  constructor(config: Config.ProjectConfig) {
    this._config = config;
    this._transformCache = new Map();

    let projectCache = projectCaches.get(config);

    if (!projectCache) {
      projectCache = {
        configString: stableStringify(this._config),
        ignorePatternsRegExp: calcIgnorePatternRegExp(this._config),
        transformRegExp: calcTransformRegExp(this._config),
        transformedFiles: new Map(),
      };

      projectCaches.set(config, projectCache);
    }

    this._cache = projectCache;
  }

  private _getCacheKey(
    fileData: string,
    filename: Config.Path,
    instrument: boolean,
  ): string {
    const configString = this._cache.configString;
    const transformer = this._getTransformer(filename);

    if (transformer && typeof transformer.getCacheKey === 'function') {
      return crypto
        .createHash('md5')
        .update(
          transformer.getCacheKey(fileData, filename, configString, {
            config: this._config,
            instrument,
            rootDir: this._config.rootDir,
          }),
        )
        .update(CACHE_VERSION)
        .digest('hex');
    } else {
      return crypto
        .createHash('md5')
        .update(fileData)
        .update(configString)
        .update(instrument ? 'instrument' : '')
        .update(filename)
        .update(CACHE_VERSION)
        .digest('hex');
    }
  }

  private _getFileCachePath(
    filename: Config.Path,
    content: string,
    instrument: boolean,
  ): Config.Path {
    const baseCacheDir = HasteMap.getCacheFilePath(
      this._config.cacheDirectory,
      'jest-transform-cache-' + this._config.name,
      VERSION,
    );
    const cacheKey = this._getCacheKey(content, filename, instrument);
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

  private _getTransformPath(filename: Config.Path) {
    const transformRegExp = this._cache.transformRegExp;
    if (!transformRegExp) {
      return undefined;
    }

    for (let i = 0; i < transformRegExp.length; i++) {
      if (transformRegExp[i][0].test(filename)) {
        return transformRegExp[i][1];
      }
    }

    return undefined;
  }

  private _getTransformer(filename: Config.Path) {
    let transform: Transformer | null = null;
    if (!this._config.transform || !this._config.transform.length) {
      return null;
    }

    const transformPath = this._getTransformPath(filename);
    if (transformPath) {
      const transformer = this._transformCache.get(transformPath);
      if (transformer != null) {
        return transformer;
      }

      transform = require(transformPath) as Transformer;
      if (typeof transform.createTransformer === 'function') {
        transform = transform.createTransformer();
      }
      if (typeof transform.process !== 'function') {
        throw new TypeError(
          'Jest: a transform must export a `process` function.',
        );
      }
      this._transformCache.set(transformPath, transform);
    }
    return transform;
  }

  private _instrumentFile(filename: Config.Path, content: string): string {
    const result = babelTransform(content, {
      auxiliaryCommentBefore: ' istanbul ignore next ',
      babelrc: false,
      caller: {
        name: '@jest/transform',
        supportsStaticESM: false,
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
            useInlineSourceMaps: false,
          },
        ],
      ],
    });

    if (result) {
      const {code} = result;

      if (code) {
        return code;
      }
    }

    return content;
  }

  private _getRealPath(filepath: Config.Path): Config.Path {
    try {
      return realpath(filepath) || filepath;
    } catch (err) {
      return filepath;
    }
  }

  // We don't want to expose transformers to the outside - this function is just
  // to warm up `this._transformCache`
  preloadTransformer(filepath: Config.Path): void {
    this._getTransformer(filepath);
  }

  transformSource(filepath: Config.Path, content: string, instrument: boolean) {
    const filename = this._getRealPath(filepath);
    const transform = this._getTransformer(filename);
    const cacheFilePath = this._getFileCachePath(filename, content, instrument);
    let sourceMapPath: Config.Path | null = cacheFilePath + '.map';
    // Ignore cache if `config.cache` is set (--no-cache)
    let code = this._config.cache ? readCodeCacheFile(cacheFilePath) : null;

    const shouldCallTransform = transform && this.shouldTransform(filename);

    // That means that the transform has a custom instrumentation
    // logic and will handle it based on `config.collectCoverage` option
    const transformWillInstrument =
      shouldCallTransform && transform && transform.canInstrument;

    // If we handle the coverage instrumentation, we should try to map code
    // coverage against original source with any provided source map
    const mapCoverage = instrument && !transformWillInstrument;

    if (code) {
      // This is broken: we return the code, and a path for the source map
      // directly from the cache. But, nothing ensures the source map actually
      // matches that source code. They could have gotten out-of-sync in case
      // two separate processes write concurrently to the same cache files.
      return {
        code,
        mapCoverage,
        sourceMapPath,
      };
    }

    let transformed: TransformedSource = {
      code: content,
      map: null,
    };

    if (transform && shouldCallTransform) {
      const processed = transform.process(content, filename, this._config, {
        instrument,
      });

      if (typeof processed === 'string') {
        transformed.code = processed;
      } else if (processed != null && typeof processed.code === 'string') {
        transformed = processed;
      } else {
        throw new TypeError(
          "Jest: a transform's `process` function must return a string, " +
            'or an object with `code` key containing this string.',
        );
      }
    }

    if (!transformed.map) {
      //Could be a potential freeze here.
      //See: https://github.com/facebook/jest/pull/5177#discussion_r158883570
      const inlineSourceMap = convertSourceMap.fromSource(transformed.code);

      if (inlineSourceMap) {
        transformed.map = inlineSourceMap.toJSON();
      }
    }

    if (!transformWillInstrument && instrument) {
      code = this._instrumentFile(filename, transformed.code);
    } else {
      code = transformed.code;
    }

    if (transformed.map) {
      const sourceMapContent =
        typeof transformed.map === 'string'
          ? transformed.map
          : JSON.stringify(transformed.map);
      writeCacheFile(sourceMapPath, sourceMapContent);
    } else {
      sourceMapPath = null;
    }

    writeCodeCacheFile(cacheFilePath, code);

    return {
      code,
      mapCoverage,
      sourceMapPath,
    };
  }

  private _transformAndBuildScript(
    filename: Config.Path,
    options: Options | null,
    instrument: boolean,
    fileSource?: string,
  ): TransformResult {
    const isInternalModule = !!(options && options.isInternalModule);
    const isCoreModule = !!(options && options.isCoreModule);
    const content = stripShebang(
      fileSource || fs.readFileSync(filename, 'utf8'),
    );

    let wrappedCode: string;
    let sourceMapPath: string | null = null;
    let mapCoverage = false;

    const willTransform =
      !isInternalModule &&
      !isCoreModule &&
      (this.shouldTransform(filename) || instrument);

    try {
      const extraGlobals = (options && options.extraGlobals) || [];

      if (willTransform) {
        const transformedSource = this.transformSource(
          filename,
          content,
          instrument,
        );

        wrappedCode = wrap(transformedSource.code, ...extraGlobals);
        sourceMapPath = transformedSource.sourceMapPath;
        mapCoverage = transformedSource.mapCoverage;
      } else {
        wrappedCode = wrap(content, ...extraGlobals);
      }

      return {
        mapCoverage,
        script: new vm.Script(wrappedCode, {
          displayErrors: true,
          filename: isCoreModule ? 'jest-nodejs-core-' + filename : filename,
        }),
        sourceMapPath,
      };
    } catch (e) {
      if (e.codeFrame) {
        e.stack = e.message + '\n' + e.codeFrame;
      }

      if (
        e instanceof SyntaxError &&
        e.message.includes('Unexpected token') &&
        !e.message.includes(' expected')
      ) {
        throw enhanceUnexpectedTokenMessage(e);
      }

      throw e;
    }
  }

  transform(
    filename: Config.Path,
    options: Options,
    fileSource?: string,
  ): TransformResult {
    let scriptCacheKey = undefined;
    let instrument = false;

    if (!options.isCoreModule) {
      instrument = shouldInstrument(filename, options, this._config);
      scriptCacheKey = getScriptCacheKey(filename, instrument);
      const result = this._cache.transformedFiles.get(scriptCacheKey);
      if (result) {
        return result;
      }
    }

    const result = this._transformAndBuildScript(
      filename,
      options,
      instrument,
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
    const isInternalModule = options.isInternalModule;
    const isCoreModule = options.isCoreModule;
    const willTransform =
      !isInternalModule && !isCoreModule && this.shouldTransform(filename);

    if (willTransform) {
      const {code: transformedJsonSource} = this.transformSource(
        filename,
        fileSource,
        false,
      );
      return transformedJsonSource;
    }

    return fileSource;
  }

  /**
   * @deprecated use `this.shouldTransform` instead
   */
  // @ts-ignore: Unused and private - remove in Jest 25
  private _shouldTransform(filename: Config.Path): boolean {
    return this.shouldTransform(filename);
  }

  shouldTransform(filename: Config.Path): boolean {
    const ignoreRegexp = this._cache.ignorePatternsRegExp;
    const isIgnored = ignoreRegexp ? ignoreRegexp.test(filename) : false;

    return (
      !!this._config.transform && !!this._config.transform.length && !isIgnored
    );
  }
}

const removeFile = (path: Config.Path) => {
  try {
    fs.unlinkSync(path);
  } catch (e) {}
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
  const checksum = crypto
    .createHash('md5')
    .update(code)
    .digest('hex');
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
  const checksum = crypto
    .createHash('md5')
    .update(code)
    .digest('hex');
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
    writeFileAtomic.sync(cachePath, fileData, {encoding: 'utf8'});
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

  const transformRegexp: Array<[RegExp, string]> = [];
  for (let i = 0; i < config.transform.length; i++) {
    transformRegexp.push([
      new RegExp(config.transform[i][0]),
      config.transform[i][1],
    ]);
  }

  return transformRegexp;
};

const wrap = (content: string, ...extras: Array<string>) => {
  const globals = new Set([
    'module',
    'exports',
    'require',
    '__dirname',
    '__filename',
    'global',
    'jest',
    ...extras,
  ]);

  return (
    '({"' +
    ScriptTransformer.EVAL_RESULT_VARIABLE +
    `":function(${Array.from(globals).join(',')}){` +
    content +
    '\n}});'
  );
};

// TODO: Can this be added to the static property?
ScriptTransformer.EVAL_RESULT_VARIABLE = 'Object.<anonymous>';
