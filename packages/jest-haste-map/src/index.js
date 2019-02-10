/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {execSync} from 'child_process';
import {version as VERSION} from '../package.json';
import {getSha1, worker} from './worker';
import crypto from 'crypto';
import EventEmitter from 'events';
import fs from 'fs';
import getMockName from './getMockName';
import getPlatformExtension from './lib/getPlatformExtension';
import H from './constants';
import HasteFS from './HasteFS';
import HasteModuleMap from './ModuleMap';
import invariant from 'invariant';
// eslint-disable-next-line import/default
import nodeCrawl from './crawlers/node';
import normalizePathSep from './lib/normalizePathSep';
import os from 'os';
import path from 'path';
import sane from 'sane';
import serializer from 'jest-serializer';
// eslint-disable-next-line import/default
import watchmanCrawl from './crawlers/watchman';
import WatchmanWatcher from './lib/WatchmanWatcher';
import * as fastPath from './lib/fast_path';
import Worker from 'jest-worker';

import type {Console} from 'console';
import type {Mapper} from './types';
import type {Path} from 'types/Config';
import type {
  HasteMap as HasteMapObject,
  InternalHasteMap,
  ModuleMetaData,
  ModuleMapData,
  HasteRegExp,
  MockData,
} from 'types/HasteMap';
import type {SerializableModuleMap as HasteSerializableModuleMap} from './ModuleMap';

type HType = typeof H;

type Options = {
  cacheDirectory?: string,
  computeDependencies?: boolean,
  computeSha1?: boolean,
  console?: Console,
  dependencyExtractor?: string,
  extensions: Array<string>,
  forceNodeFilesystemAPI?: boolean,
  hasteImplModulePath?: string,
  ignorePattern?: ?HasteRegExp,
  mapper?: ?Mapper,
  maxWorkers: number,
  mocksPattern?: string,
  name: string,
  platforms: Array<string>,
  providesModuleNodeModules?: Array<string>,
  resetCache?: boolean,
  retainAllFiles: boolean,
  rootDir: string,
  roots: Array<string>,
  throwOnModuleCollision?: boolean,
  useWatchman?: boolean,
  watch?: boolean,
};

type InternalOptions = {
  cacheDirectory: string,
  computeDependencies: boolean,
  computeSha1: boolean,
  dependencyExtractor?: string,
  extensions: Array<string>,
  forceNodeFilesystemAPI: boolean,
  hasteImplModulePath?: string,
  ignorePattern: ?HasteRegExp,
  mapper?: ?Mapper,
  maxWorkers: number,
  mocksPattern: ?RegExp,
  name: string,
  platforms: Array<string>,
  resetCache: ?boolean,
  retainAllFiles: boolean,
  rootDir: string,
  roots: Array<string>,
  throwOnModuleCollision: boolean,
  useWatchman: boolean,
  watch: boolean,
};

type Watcher = {
  close(callback: () => void): void,
};

type WorkerInterface = {worker: typeof worker, getSha1: typeof getSha1};

export type ModuleMap = HasteModuleMap;
export type SerializableModuleMap = HasteSerializableModuleMap;
export type FS = HasteFS;

const CHANGE_INTERVAL = 30;
const MAX_WAIT_TIME = 240000;
const NODE_MODULES = path.sep + 'node_modules' + path.sep;

const canUseWatchman = ((): boolean => {
  try {
    execSync('watchman --version', {stdio: ['ignore']});
    return true;
  } catch (e) {}
  return false;
})();

const escapePathSeparator = string =>
  path.sep === '\\' ? string.replace(/(\/|\\)/g, '\\\\') : string;

const getWhiteList = (list: ?Array<string>): ?RegExp => {
  if (list && list.length) {
    const newList = list.map(item =>
      escapePathSeparator(item.replace(/(\/)/g, path.sep)),
    );
    return new RegExp(
      '(' +
        escapePathSeparator(NODE_MODULES) +
        '(?:' +
        newList.join('|') +
        ')(?=$|' +
        escapePathSeparator(path.sep) +
        '))',
      'g',
    );
  }
  return null;
};

/**
 * HasteMap is a JavaScript implementation of Facebook's haste module system.
 *
 * This implementation is inspired by https://github.com/facebook/node-haste
 * and was built with for high-performance in large code repositories with
 * hundreds of thousands of files. This implementation is scalable and provides
 * predictable performance.
 *
 * Because the haste map creation and synchronization is critical to startup
 * performance and most tasks are blocked by I/O this class makes heavy use of
 * synchronous operations. It uses worker processes for parallelizing file
 * access and metadata extraction.
 *
 * The data structures created by `jest-haste-map` can be used directly from the
 * cache without further processing. The metadata objects in the `files` and
 * `map` objects contain cross-references: a metadata object from one can look
 * up the corresponding metadata object in the other map. Note that in most
 * projects, the number of files will be greater than the number of haste
 * modules one module can refer to many files based on platform extensions.
 *
 * type HasteMap = {
 *   clocks: WatchmanClocks,
 *   files: {[filepath: string]: FileMetaData},
 *   map: {[id: string]: ModuleMapItem},
 *   mocks: {[id: string]: string},
 * }
 *
 * // Watchman clocks are used for query synchronization and file system deltas.
 * type WatchmanClocks = {[filepath: string]: string};
 *
 * type FileMetaData = {
 *   id: ?string, // used to look up module metadata objects in `map`.
 *   mtime: number, // check for outdated files.
 *   size: number, // size of the file in bytes.
 *   visited: boolean, // whether the file has been parsed or not.
 *   dependencies: Array<string>, // all relative dependencies of this file.
 *   sha1: ?string, // SHA-1 of the file, if requested via options.
 * };
 *
 * // Modules can be targeted to a specific platform based on the file name.
 * // Example: platform.ios.js and Platform.android.js will both map to the same
 * // `Platform` module. The platform should be specified during resolution.
 * type ModuleMapItem = {[platform: string]: ModuleMetaData};
 *
 * //
 * type ModuleMetaData = {
 *   path: string, // the path to look up the file object in `files`.
 *   type: string, // the module type (either `package` or `module`).
 * };
 *
 * Note that the data structures described above are conceptual only. The actual
 * implementation uses arrays and constant keys for metadata storage. Instead of
 * `{id: 'flatMap', mtime: 3421, size: 42, visited: true, dependencies: []}` the real
 * representation is similar to `['flatMap', 3421, 42, 1, []]` to save storage space
 * and reduce parse and write time of a big JSON blob.
 *
 * The HasteMap is created as follows:
 *  1. read data from the cache or create an empty structure.
 *
 *  2. crawl the file system.
 *     * empty cache: crawl the entire file system.
 *     * cache available:
 *       * if watchman is available: get file system delta changes.
 *       * if watchman is unavailable: crawl the entire file system.
 *     * build metadata objects for every file. This builds the `files` part of
 *       the `HasteMap`.
 *
 *  3. parse and extract metadata from changed files.
 *     * this is done in parallel over worker processes to improve performance.
 *     * the worst case is to parse all files.
 *     * the best case is no file system access and retrieving all data from
 *       the cache.
 *     * the average case is a small number of changed files.
 *
 *  4. serialize the new `HasteMap` in a cache file.
 *     Worker processes can directly access the cache through `HasteMap.read()`.
 *
 */
class HasteMap extends EventEmitter {
  _buildPromise: ?Promise<HasteMapObject>;
  _cachePath: Path;
  _changeInterval: IntervalID;
  _console: Console;
  _options: InternalOptions;
  _watchers: Array<Watcher>;
  _whitelist: ?RegExp;
  _worker: ?WorkerInterface;

  constructor(options: Options) {
    super();
    this._options = {
      cacheDirectory: options.cacheDirectory || os.tmpdir(),
      computeDependencies:
        options.computeDependencies === undefined
          ? true
          : options.computeDependencies,
      computeSha1: options.computeSha1 || false,
      dependencyExtractor: options.dependencyExtractor,
      extensions: options.extensions,
      forceNodeFilesystemAPI: !!options.forceNodeFilesystemAPI,
      hasteImplModulePath: options.hasteImplModulePath,
      ignorePattern: options.ignorePattern,
      maxWorkers: options.maxWorkers,
      mocksPattern: options.mocksPattern
        ? new RegExp(options.mocksPattern)
        : null,
      name: options.name,
      platforms: options.platforms,
      resetCache: options.resetCache,
      retainAllFiles: options.retainAllFiles,
      rootDir: options.rootDir,
      roots: Array.from(new Set(options.roots)),
      throwOnModuleCollision: !!options.throwOnModuleCollision,
      useWatchman: options.useWatchman == null ? true : options.useWatchman,
      watch: !!options.watch,
    };
    this._console = options.console || global.console;
    if (options.ignorePattern && !(options.ignorePattern instanceof RegExp)) {
      this._console.warn(
        'jest-haste-map: the `ignorePattern` options as a function is being ' +
          'deprecated. Provide a RegExp instead. See https://github.com/facebook/jest/pull/4063.',
      );
    }

    const rootDirHash = crypto
      .createHash('md5')
      .update(options.rootDir)
      .digest('hex');
    let hasteImplHash = '';
    let dependencyExtractorHash = '';

    if (options.hasteImplModulePath) {
      // $FlowFixMe: dynamic require
      const hasteImpl = require(options.hasteImplModulePath);
      if (hasteImpl.getCacheKey) {
        hasteImplHash = String(hasteImpl.getCacheKey());
      }
    }

    if (options.dependencyExtractor) {
      // $FlowFixMe: dynamic require
      const dependencyExtractor = require(options.dependencyExtractor);
      if (dependencyExtractor.getCacheKey) {
        dependencyExtractorHash = String(dependencyExtractor.getCacheKey());
      }
    }

    this._cachePath = HasteMap.getCacheFilePath(
      this._options.cacheDirectory,
      `haste-map-${this._options.name}-${rootDirHash}`,
      VERSION,
      this._options.name,
      this._options.roots
        .map(root => fastPath.relative(options.rootDir, root))
        .join(':'),
      this._options.extensions.join(':'),
      this._options.platforms.join(':'),
      this._options.computeSha1.toString(),
      options.mocksPattern || '',
      (options.ignorePattern || '').toString(),
      hasteImplHash,
      dependencyExtractorHash,
    );
    this._whitelist = getWhiteList(options.providesModuleNodeModules);
    this._buildPromise = null;
    this._watchers = [];
    this._worker = null;
  }

  static getCacheFilePath(
    tmpdir: Path,
    name: string,
    ...extra: Array<string>
  ): string {
    const hash = crypto.createHash('md5').update(extra.join(''));
    return path.join(
      tmpdir,
      name.replace(/\W/g, '-') + '-' + hash.digest('hex'),
    );
  }

  getCacheFilePath(): string {
    return this._cachePath;
  }

  build(): Promise<HasteMapObject> {
    if (!this._buildPromise) {
      this._buildPromise = this._buildFileMap()
        .then(data => this._buildHasteMap(data))
        .then(hasteMap => {
          this._persist(hasteMap);

          const rootDir = this._options.rootDir;
          const hasteFS = new HasteFS({
            files: hasteMap.files,
            rootDir,
          });
          const moduleMap = new HasteModuleMap({
            duplicates: hasteMap.duplicates,
            map: hasteMap.map,
            mocks: hasteMap.mocks,
            rootDir,
          });
          const __hasteMapForTest =
            (process.env.NODE_ENV === 'test' && hasteMap) || null;
          return this._watch(hasteMap, hasteFS, moduleMap).then(() => ({
            __hasteMapForTest,
            hasteFS,
            moduleMap,
          }));
        });
    }
    return this._buildPromise;
  }

  /**
   * 1. read data from the cache or create an empty structure.
   */
  read(): InternalHasteMap {
    let hasteMap: InternalHasteMap;

    try {
      hasteMap = serializer.readFileSync(this._cachePath);
    } catch (err) {
      hasteMap = this._createEmptyMap();
    }

    return hasteMap;
  }

  readModuleMap(): ModuleMap {
    const data = this.read();
    return new HasteModuleMap({
      duplicates: data.duplicates,
      map: data.map,
      mocks: data.mocks,
      rootDir: this._options.rootDir,
    });
  }

  /**
   * 2. crawl the file system.
   */
  _buildFileMap(): Promise<{
    deprecatedFiles: Array<{moduleName: string, path: string}>,
    hasteMap: InternalHasteMap,
  }> {
    const read = this._options.resetCache ? this._createEmptyMap : this.read;

    return Promise.resolve()
      .then(() => read.call(this))
      .catch(() => this._createEmptyMap())
      .then(cachedHasteMap => {
        const cachedFiles = [];
        for (const [relativeFilePath, fileMetadata] of cachedHasteMap.files) {
          const moduleName = fileMetadata[H.ID];
          cachedFiles.push({moduleName, path: relativeFilePath});
        }
        return this._crawl(cachedHasteMap).then(hasteMap => {
          const deprecatedFiles = cachedFiles.filter(
            file => !hasteMap.files.has(file.path),
          );
          return {deprecatedFiles, hasteMap};
        });
      });
  }

  /**
   * 3. parse and extract metadata from changed files.
   */
  _processFile(
    hasteMap: InternalHasteMap,
    map: ModuleMapData,
    mocks: MockData,
    filePath: Path,
    workerOptions: ?{forceInBand: boolean},
  ): ?Promise<void> {
    const rootDir = this._options.rootDir;

    const setModule = (id: string, module: ModuleMetaData) => {
      let moduleMap = map.get(id);
      if (!moduleMap) {
        moduleMap = Object.create(null);
        map.set(id, moduleMap);
      }
      const platform =
        getPlatformExtension(module[H.PATH], this._options.platforms) ||
        H.GENERIC_PLATFORM;

      const existingModule = moduleMap[platform];
      if (existingModule && existingModule[H.PATH] !== module[H.PATH]) {
        const message =
          `jest-haste-map: Haste module naming collision:\n` +
          `  Duplicate module name: ${id}\n` +
          `  Paths: ${fastPath.resolve(
            rootDir,
            module[H.PATH],
          )} collides with ` +
          `${fastPath.resolve(rootDir, existingModule[H.PATH])}\n\nThis ` +
          `${this._options.throwOnModuleCollision ? 'error' : 'warning'} ` +
          `is caused by \`hasteImpl\` returning the same name for different` +
          ` files.`;
        if (this._options.throwOnModuleCollision) {
          throw new Error(message);
        }
        this._console.warn(message);
        // We do NOT want consumers to use a module that is ambiguous.
        delete moduleMap[platform];
        if (Object.keys(moduleMap).length === 1) {
          map.delete(id);
        }
        let dupsByPlatform = hasteMap.duplicates.get(id);
        if (dupsByPlatform == null) {
          dupsByPlatform = new Map();
          hasteMap.duplicates.set(id, dupsByPlatform);
        }

        const dups = new Map([
          [module[H.PATH], module[H.TYPE]],
          [existingModule[H.PATH], existingModule[H.TYPE]],
        ]);
        dupsByPlatform.set(platform, dups);

        return;
      }

      const dupsByPlatform = hasteMap.duplicates.get(id);
      if (dupsByPlatform != null) {
        const dups = dupsByPlatform.get(platform);
        if (dups != null) {
          dups.set(module[H.PATH], module[H.TYPE]);
        }
        return;
      }

      moduleMap[platform] = module;
    };

    const relativeFilePath = fastPath.relative(rootDir, filePath);
    const fileMetadata = hasteMap.files.get(relativeFilePath);
    if (!fileMetadata) {
      throw new Error(
        'jest-haste-map: File to process was not found in the haste map.',
      );
    }

    const moduleMetadata = hasteMap.map.get(fileMetadata[H.ID]);
    const computeSha1 = this._options.computeSha1 && !fileMetadata[H.SHA1];

    // Callback called when the response from the worker is successful.
    const workerReply = metadata => {
      // `1` for truthy values instead of `true` to save cache space.
      fileMetadata[H.VISITED] = 1;

      const metadataId = metadata.id;
      const metadataModule = metadata.module;

      if (metadataId && metadataModule) {
        fileMetadata[H.ID] = metadataId;
        setModule(metadataId, metadataModule);
      }

      fileMetadata[H.DEPENDENCIES] = metadata.dependencies || [];

      if (computeSha1) {
        fileMetadata[H.SHA1] = metadata.sha1;
      }
    };

    // Callback called when the response from the worker is an error.
    const workerError = error => {
      if (typeof error !== 'object' || !error.message || !error.stack) {
        error = new Error(error);
        error.stack = ''; // Remove stack for stack-less errors.
      }

      // $FlowFixMe: checking error code is OK if error comes from "fs".
      if (!['ENOENT', 'EACCES'].includes(error.code)) {
        throw error;
      }

      // If a file cannot be read we remove it from the file list and
      // ignore the failure silently.
      hasteMap.files.delete(relativeFilePath);
    };

    // If we retain all files in the virtual HasteFS representation, we avoid
    // reading them if they aren't important (node_modules).
    if (this._options.retainAllFiles && this._isNodeModulesDir(filePath)) {
      if (computeSha1) {
        return this._getWorker(workerOptions)
          .getSha1({
            computeDependencies: this._options.computeDependencies,
            computeSha1,
            dependencyExtractor: this._options.dependencyExtractor,
            filePath,
            hasteImplModulePath: this._options.hasteImplModulePath,
            rootDir,
          })
          .then(workerReply, workerError);
      }

      return null;
    }

    if (
      this._options.mocksPattern &&
      this._options.mocksPattern.test(filePath)
    ) {
      const mockPath = getMockName(filePath);
      const existingMockPath = mocks.get(mockPath);
      if (existingMockPath) {
        this._console.warn(
          `jest-haste-map: duplicate manual mock found:\n` +
            `  Module name: ${mockPath}\n` +
            `  Duplicate Mock path: ${filePath}\nThis warning ` +
            `is caused by two manual mock files with the same file name.\n` +
            `Jest will use the mock file found in: \n` +
            `${filePath}\n` +
            ` Please delete one of the following two files: \n ` +
            `${path.join(rootDir, existingMockPath)}\n${filePath}\n\n`,
        );
      }
      mocks.set(mockPath, relativeFilePath);
    }

    if (fileMetadata[H.VISITED]) {
      if (!fileMetadata[H.ID]) {
        return null;
      }

      if (moduleMetadata != null) {
        const platform =
          getPlatformExtension(filePath, this._options.platforms) ||
          H.GENERIC_PLATFORM;

        const module = moduleMetadata[platform];

        if (module == null) {
          return null;
        }

        const moduleId = fileMetadata[H.ID];
        let modulesByPlatform = map.get(moduleId);
        if (!modulesByPlatform) {
          modulesByPlatform = Object.create(null);
          map.set(moduleId, modulesByPlatform);
        }
        modulesByPlatform[platform] = module;

        return null;
      }
    }

    return this._getWorker(workerOptions)
      .worker({
        computeDependencies: this._options.computeDependencies,
        computeSha1,
        dependencyExtractor: this._options.dependencyExtractor,
        filePath,
        hasteImplModulePath: this._options.hasteImplModulePath,
        rootDir,
      })
      .then(workerReply, workerError);
  }

  _buildHasteMap(data: {
    deprecatedFiles: Array<{moduleName: string, path: string}>,
    hasteMap: InternalHasteMap,
  }): Promise<InternalHasteMap> {
    const {deprecatedFiles, hasteMap} = data;
    const map = new Map();
    const mocks = new Map();
    const promises = [];

    for (let i = 0; i < deprecatedFiles.length; ++i) {
      const file = deprecatedFiles[i];
      this._recoverDuplicates(hasteMap, file.path, file.moduleName);
    }

    for (const relativeFilePath of hasteMap.files.keys()) {
      // SHA-1, if requested, should already be present thanks to the crawler.
      const filePath = fastPath.resolve(
        this._options.rootDir,
        relativeFilePath,
      );
      const promise = this._processFile(hasteMap, map, mocks, filePath);
      if (promise) {
        promises.push(promise);
      }
    }

    return Promise.all(promises)
      .then(() => {
        this._cleanup();
        hasteMap.map = map;
        hasteMap.mocks = mocks;
        return hasteMap;
      })
      .catch(error => {
        this._cleanup();
        return Promise.reject(error);
      });
  }

  _cleanup() {
    const worker = this._worker;

    // $FlowFixMe
    if (worker && typeof worker.end === 'function') {
      worker.end();
    }

    this._worker = null;
  }

  /**
   * 4. serialize the new `HasteMap` in a cache file.
   */
  _persist(hasteMap: InternalHasteMap) {
    serializer.writeFileSync(this._cachePath, hasteMap);
  }

  /**
   * Creates workers or parses files and extracts metadata in-process.
   */
  _getWorker(options: ?{forceInBand: boolean}): WorkerInterface {
    if (!this._worker) {
      if ((options && options.forceInBand) || this._options.maxWorkers <= 1) {
        this._worker = {getSha1, worker};
      } else {
        // $FlowFixMe: assignment of a worker with custom properties.
        this._worker = (new Worker(require.resolve('./worker'), {
          exposedMethods: ['getSha1', 'worker'],
          maxRetries: 3,
          numWorkers: this._options.maxWorkers,
        }): WorkerInterface);
      }
    }

    return this._worker;
  }

  _crawl(hasteMap: InternalHasteMap): Promise<InternalHasteMap> {
    const options = this._options;
    const ignore = this._ignore.bind(this);
    const crawl =
      canUseWatchman && this._options.useWatchman ? watchmanCrawl : nodeCrawl;

    const retry = error => {
      if (crawl === watchmanCrawl) {
        this._console.warn(
          `jest-haste-map: Watchman crawl failed. Retrying once with node ` +
            `crawler.\n` +
            `  Usually this happens when watchman isn't running. Create an ` +
            `empty \`.watchmanconfig\` file in your project's root folder or ` +
            `initialize a git or hg repository in your project.\n` +
            `  ` +
            error,
        );
        return nodeCrawl({
          computeSha1: options.computeSha1,
          data: hasteMap,
          extensions: options.extensions,
          forceNodeFilesystemAPI: options.forceNodeFilesystemAPI,
          ignore,
          mapper: options.mapper,
          rootDir: options.rootDir,
          roots: options.roots,
        }).catch(e => {
          throw new Error(
            `Crawler retry failed:\n` +
              `  Original error: ${error.message}\n` +
              `  Retry error: ${e.message}\n`,
          );
        });
      }

      throw error;
    };

    try {
      return crawl({
        computeSha1: options.computeSha1,
        data: hasteMap,
        extensions: options.extensions,
        forceNodeFilesystemAPI: options.forceNodeFilesystemAPI,
        ignore,
        rootDir: options.rootDir,
        roots: options.roots,
      }).catch(retry);
    } catch (error) {
      return retry(error);
    }
  }

  /**
   * Watch mode
   */
  _watch(
    hasteMap: InternalHasteMap,
    hasteFS: HasteFS,
    moduleMap: ModuleMap,
  ): Promise<void> {
    if (!this._options.watch) {
      return Promise.resolve();
    }

    // In watch mode, we'll only warn about module collisions and we'll retain
    // all files, even changes to node_modules.
    this._options.throwOnModuleCollision = false;
    this._options.retainAllFiles = true;

    const Watcher =
      canUseWatchman && this._options.useWatchman
        ? WatchmanWatcher
        : os.platform() === 'darwin'
        ? sane.FSEventsWatcher
        : sane.NodeWatcher;
    const extensions = this._options.extensions;
    const ignorePattern = this._options.ignorePattern;
    const rootDir = this._options.rootDir;

    let changeQueue = Promise.resolve();
    let eventsQueue = [];
    // We only need to copy the entire haste map once on every "frame".
    let mustCopy = true;

    const createWatcher = root => {
      const watcher = new Watcher(root, {
        dot: false,
        glob: extensions.map(extension => '**/*.' + extension),
        ignored: ignorePattern,
      });

      return new Promise((resolve, reject) => {
        const rejectTimeout = setTimeout(
          () => reject(new Error('Failed to start watch mode.')),
          MAX_WAIT_TIME,
        );

        watcher.once('ready', () => {
          clearTimeout(rejectTimeout);
          watcher.on('all', onChange);
          resolve(watcher);
        });
      });
    };

    const emitChange = () => {
      if (eventsQueue.length) {
        mustCopy = true;
        this.emit('change', {
          eventsQueue,
          hasteFS: new HasteFS({
            files: hasteMap.files,
            rootDir,
          }),
          moduleMap: new HasteModuleMap({
            duplicates: hasteMap.duplicates,
            map: hasteMap.map,
            mocks: hasteMap.mocks,
            rootDir,
          }),
        });
        eventsQueue = [];
      }
    };

    const onChange = (
      type: string,
      filePath: Path,
      root: Path,
      stat: ?fs.Stats,
    ) => {
      filePath = path.join(root, normalizePathSep(filePath));
      if (
        (stat && stat.isDirectory()) ||
        this._ignore(filePath) ||
        !extensions.some(extension => filePath.endsWith(extension))
      ) {
        return;
      }

      changeQueue = changeQueue
        .then(() => {
          // If we get duplicate events for the same file, ignore them.
          if (
            eventsQueue.find(
              event =>
                event.type === type &&
                event.filePath === filePath &&
                ((!event.stat && !stat) ||
                  (event.stat &&
                    stat &&
                    event.stat.mtime.getTime() === stat.mtime.getTime())),
            )
          ) {
            return null;
          }

          if (mustCopy) {
            mustCopy = false;
            hasteMap = {
              clocks: new Map(hasteMap.clocks),
              duplicates: new Map(hasteMap.duplicates),
              files: new Map(hasteMap.files),
              map: new Map(hasteMap.map),
              mocks: new Map(hasteMap.mocks),
            };
          }

          const add = () => eventsQueue.push({filePath, stat, type});

          const relativeFilePath = fastPath.relative(rootDir, filePath);
          const fileMetadata = hasteMap.files.get(relativeFilePath);

          // If it's not an addition, delete the file and all its metadata
          if (fileMetadata != null) {
            const moduleName = fileMetadata[H.ID];
            const platform =
              getPlatformExtension(filePath, this._options.platforms) ||
              H.GENERIC_PLATFORM;
            hasteMap.files.delete(relativeFilePath);

            let moduleMap = hasteMap.map.get(moduleName);
            if (moduleMap != null) {
              // We are forced to copy the object because jest-haste-map exposes
              // the map as an immutable entity.
              moduleMap = copy(moduleMap);
              delete moduleMap[platform];
              if (Object.keys(moduleMap).length === 0) {
                hasteMap.map.delete(moduleName);
              } else {
                hasteMap.map.set(moduleName, moduleMap);
              }
            }

            if (
              this._options.mocksPattern &&
              this._options.mocksPattern.test(filePath)
            ) {
              const mockName = getMockName(filePath);
              hasteMap.mocks.delete(mockName);
            }

            this._recoverDuplicates(hasteMap, relativeFilePath, moduleName);
          }

          // If the file was added or changed,
          // parse it and update the haste map.
          if (type === 'add' || type === 'change') {
            invariant(
              stat,
              'since the file exists or changed, it should have stats',
            );
            const fileMetadata = [
              '',
              stat.mtime.getTime(),
              stat.size,
              0,
              [],
              null,
            ];
            hasteMap.files.set(relativeFilePath, fileMetadata);
            const promise = this._processFile(
              hasteMap,
              hasteMap.map,
              hasteMap.mocks,
              filePath,
              {forceInBand: true},
            );
            // Cleanup
            this._cleanup();
            if (promise) {
              return promise.then(add);
            } else {
              // If a file in node_modules has changed,
              // emit an event regardless.
              add();
            }
          } else {
            add();
          }
          return null;
        })
        .catch(error => {
          this._console.error(
            `jest-haste-map: watch error:\n  ${error.stack}\n`,
          );
        });
    };

    this._changeInterval = setInterval(emitChange, CHANGE_INTERVAL);
    return Promise.all(this._options.roots.map(createWatcher)).then(
      watchers => {
        this._watchers = watchers;
      },
    );
  }

  /**
   * This function should be called when the file under `filePath` is removed
   * or changed. When that happens, we want to figure out if that file was
   * part of a group of files that had the same ID. If it was, we want to
   * remove it from the group. Furthermore, if there is only one file
   * remaining in the group, then we want to restore that single file as the
   * correct resolution for its ID, and cleanup the duplicates index.
   */
  _recoverDuplicates(
    hasteMap: InternalHasteMap,
    relativeFilePath: string,
    moduleName: string,
  ) {
    let dupsByPlatform = hasteMap.duplicates.get(moduleName);
    if (dupsByPlatform == null) {
      return;
    }

    const platform =
      getPlatformExtension(relativeFilePath, this._options.platforms) ||
      H.GENERIC_PLATFORM;
    let dups = dupsByPlatform.get(platform);
    if (dups == null) {
      return;
    }

    dupsByPlatform = copyMap(dupsByPlatform);
    hasteMap.duplicates.set(moduleName, dupsByPlatform);

    dups = copyMap(dups);
    dupsByPlatform.set(platform, dups);
    dups.delete(relativeFilePath);

    if (dups.size !== 1) {
      return;
    }

    const uniqueModule = dups.entries().next().value;

    if (!uniqueModule) {
      return;
    }

    let dedupMap = hasteMap.map.get(moduleName);

    if (dedupMap == null) {
      dedupMap = Object.create(null);
      hasteMap.map.set(moduleName, dedupMap);
    }
    dedupMap[platform] = uniqueModule;
    dupsByPlatform.delete(platform);
    if (dupsByPlatform.size === 0) {
      hasteMap.duplicates.delete(moduleName);
    }
  }

  end(): Promise<void> {
    clearInterval(this._changeInterval);
    if (!this._watchers.length) {
      return Promise.resolve();
    }

    return Promise.all(
      this._watchers.map(
        watcher => new Promise(resolve => watcher.close(resolve)),
      ),
    ).then(() => {
      this._watchers = [];
    });
  }

  /**
   * Helpers
   */
  _ignore(filePath: Path): boolean {
    const ignorePattern = this._options.ignorePattern;
    const ignoreMatched =
      ignorePattern instanceof RegExp
        ? ignorePattern.test(filePath)
        : ignorePattern && ignorePattern(filePath);

    return (
      ignoreMatched ||
      (!this._options.retainAllFiles && this._isNodeModulesDir(filePath))
    );
  }

  _isNodeModulesDir(filePath: Path): boolean {
    if (!filePath.includes(NODE_MODULES)) {
      return false;
    }

    if (this._whitelist) {
      const whitelist = this._whitelist;
      const match = whitelist.exec(filePath);
      const matchEndIndex = whitelist.lastIndex;
      whitelist.lastIndex = 0;

      if (!match) {
        return true;
      }

      const filePathInPackage = filePath.substr(matchEndIndex);
      return filePathInPackage.startsWith(NODE_MODULES);
    }

    return true;
  }

  _createEmptyMap(): InternalHasteMap {
    return {
      clocks: new Map(),
      duplicates: new Map(),
      files: new Map(),
      map: new Map(),
      mocks: new Map(),
    };
  }

  static H: HType;
  static ModuleMap: Class<HasteModuleMap>;
}

const copy = object => Object.assign(Object.create(null), object);

function copyMap<K, V>(input: Map<K, V>): Map<K, V> {
  return new Map(input);
}

HasteMap.H = H;
HasteMap.ModuleMap = HasteModuleMap;

module.exports = HasteMap;
