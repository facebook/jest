/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/ban-types-eventually */

import {execSync} from 'child_process';
import {createHash} from 'crypto';
import {EventEmitter} from 'events';
import {tmpdir} from 'os';
import * as path from 'path';
import type {Stats} from 'graceful-fs';
import type {Config} from '@jest/types';
import {escapePathForRegex} from 'jest-regex-util';
import serializer from 'jest-serializer';
import HasteFS from './HasteFS';
import JestWorkerMetadataExtractor from './JetWorkerMetadataExtractor';
import HasteModuleMap from './ModuleMap';
import H from './constants';
import nodeCrawl = require('./crawlers/node');
import watchmanCrawl = require('./crawlers/watchman');
import getMockName from './getMockName';
import * as fastPath from './lib/fast_path';
import getPlatformExtension from './lib/getPlatformExtension';
import normalizePathSep from './lib/normalizePathSep';
import type {
  ChangeEvent,
  CrawlerOptions,
  EventsQueue,
  ExtractedFileMetaData,
  FileData,
  FileMetaData,
  HasteRegExp,
  InternalHasteMap,
  HasteMap as InternalHasteMapObject,
  MetadataExtractor,
  MockData,
  ModuleMapData,
  ModuleMetaData,
} from './types';
import FSEventsWatcher = require('./watchers/FSEventsWatcher');
// @ts-expect-error: not converted to TypeScript - it's a fork: https://github.com/facebook/jest/pull/10919
import NodeWatcher from './watchers/NodeWatcher';
// @ts-expect-error: not converted to TypeScript - it's a fork: https://github.com/facebook/jest/pull/5387
import WatchmanWatcher from './watchers/WatchmanWatcher';
// TypeScript doesn't like us importing from outside `rootDir`, but it doesn't
// understand `require`.
const {version: VERSION} = require('../package.json');

type Options = {
  cacheDirectory?: string;
  computeDependencies?: boolean;
  computeSha1?: boolean;
  console?: Console;
  dependencyExtractor?: string | null;
  extensions: Array<string>;
  forceNodeFilesystemAPI?: boolean;
  hasteImplModulePath?: string;
  ignorePattern?: HasteRegExp;
  maxWorkers: number;
  metadataExtractor?: MetadataExtractor;
  mocksPattern?: string;
  name: string;
  platforms: Array<string>;
  resetCache?: boolean;
  retainAllFiles: boolean;
  rootDir: string;
  roots: Array<string>;
  skipPackageJson?: boolean;
  throwOnModuleCollision?: boolean;
  useWatchman?: boolean;
  watch?: boolean;
};

type InternalOptions = {
  cacheDirectory: string;
  computeDependencies: boolean;
  computeSha1: boolean;
  dependencyExtractor: string | null;
  extensions: Array<string>;
  forceNodeFilesystemAPI: boolean;
  hasteImplModulePath?: string;
  ignorePattern?: HasteRegExp;
  metadataExtractor: MetadataExtractor;
  mocksPattern: RegExp | null;
  name: string;
  platforms: Array<string>;
  resetCache?: boolean;
  retainAllFiles: boolean;
  rootDir: string;
  roots: Array<string>;
  skipPackageJson: boolean;
  throwOnModuleCollision: boolean;
  useWatchman: boolean;
  watch: boolean;
};

type Watcher = {
  close(): Promise<void>;
};

export {default as ModuleMap} from './ModuleMap';
export type {SerializableModuleMap} from './ModuleMap';
export type {default as FS} from './HasteFS';
export type {
  ChangeEvent,
  HasteMap as HasteMapObject,
  MetadataExtractor,
  ExtractMetadataDefinition,
  ExtractedFileMetaData,
} from './types';
export {extractMetadata, getSha1} from './worker';

const CHANGE_INTERVAL = 30;
const MAX_WAIT_TIME = 240000;
const NODE_MODULES = path.sep + 'node_modules' + path.sep;
const PACKAGE_JSON = path.sep + 'package.json';
const VCS_DIRECTORIES = ['.git', '.hg']
  .map(vcs => escapePathForRegex(path.sep + vcs + path.sep))
  .join('|');

const canUseWatchman = ((): boolean => {
  try {
    execSync('watchman --version', {stdio: ['ignore']});
    return true;
  } catch {}
  return false;
})();

function invariant(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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
export default class HasteMap extends EventEmitter {
  private _buildPromise: Promise<InternalHasteMapObject> | null = null;
  private _cachePath: Config.Path;
  private _changeInterval?: ReturnType<typeof setInterval>;
  private _console: Console;
  private _options: InternalOptions;
  private _watchers: Array<Watcher> = [];
  private _metadataExtractorInitialized = false;

  constructor(options: Options) {
    super();
    this._options = {
      cacheDirectory: options.cacheDirectory || tmpdir(),
      computeDependencies:
        options.computeDependencies === undefined
          ? true
          : options.computeDependencies,
      computeSha1: options.computeSha1 || false,
      dependencyExtractor: options.dependencyExtractor || null,
      extensions: options.extensions,
      forceNodeFilesystemAPI: !!options.forceNodeFilesystemAPI,
      hasteImplModulePath: options.hasteImplModulePath,
      metadataExtractor:
        options.metadataExtractor ??
        new JestWorkerMetadataExtractor({maxWorkers: options.maxWorkers}),
      mocksPattern: options.mocksPattern
        ? new RegExp(options.mocksPattern)
        : null,
      name: options.name,
      platforms: options.platforms,
      resetCache: options.resetCache,
      retainAllFiles: options.retainAllFiles,
      rootDir: options.rootDir,
      roots: Array.from(new Set(options.roots)),
      skipPackageJson: !!options.skipPackageJson,
      throwOnModuleCollision: !!options.throwOnModuleCollision,
      useWatchman: options.useWatchman == null ? true : options.useWatchman,
      watch: !!options.watch,
    };
    this._console = options.console || global.console;

    if (options.ignorePattern) {
      if (options.ignorePattern instanceof RegExp) {
        this._options.ignorePattern = new RegExp(
          options.ignorePattern.source.concat('|' + VCS_DIRECTORIES),
          options.ignorePattern.flags,
        );
      } else {
        throw new Error(
          'jest-haste-map: the `ignorePattern` option must be a RegExp',
        );
      }
    } else {
      this._options.ignorePattern = new RegExp(VCS_DIRECTORIES);
    }

    const rootDirHash = createHash('md5').update(options.rootDir).digest('hex');
    let hasteImplHash = '';
    let dependencyExtractorHash = '';

    if (options.hasteImplModulePath) {
      const hasteImpl = require(options.hasteImplModulePath);
      if (hasteImpl.getCacheKey) {
        hasteImplHash = String(hasteImpl.getCacheKey());
      }
    }

    if (options.dependencyExtractor) {
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
  }

  static getCacheFilePath(
    tmpdir: Config.Path,
    name: string,
    ...extra: Array<string>
  ): string {
    const hash = createHash('md5').update(extra.join(''));
    return path.join(
      tmpdir,
      name.replace(/\W/g, '-') + '-' + hash.digest('hex'),
    );
  }

  getCacheFilePath(): string {
    return this._cachePath;
  }

  build(): Promise<InternalHasteMapObject> {
    if (!this._buildPromise) {
      this._buildPromise = (async () => {
        const data = await this._buildFileMap();

        // Persist when we don't know if files changed (changedFiles undefined)
        // or when we know a file was changed or deleted.
        let hasteMap: InternalHasteMap;
        if (
          data.changedFiles === undefined ||
          data.changedFiles.size > 0 ||
          data.removedFiles.size > 0
        ) {
          hasteMap = await this._buildHasteMap(data);
          this._persist(hasteMap);
        } else {
          hasteMap = data.hasteMap;
        }

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
        await this._watch(hasteMap);
        return {
          __hasteMapForTest,
          hasteFS,
          moduleMap,
        };
      })();
    }
    return this._buildPromise;
  }

  /**
   * 1. read data from the cache or create an empty structure.
   */
  read(): InternalHasteMap {
    let hasteMap: InternalHasteMap;

    try {
      hasteMap = serializer.readFileSync(this._cachePath) as any;
    } catch {
      hasteMap = this._createEmptyMap();
    }

    return hasteMap;
  }

  readModuleMap(): HasteModuleMap {
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
  private async _buildFileMap(): Promise<{
    removedFiles: FileData;
    changedFiles?: FileData;
    hasteMap: InternalHasteMap;
  }> {
    let hasteMap: InternalHasteMap;
    try {
      const read = this._options.resetCache ? this._createEmptyMap : this.read;
      hasteMap = await read.call(this);
    } catch {
      hasteMap = this._createEmptyMap();
    }
    return this._crawl(hasteMap);
  }

  /**
   * 3. parse and extract metadata from changed files.
   */
  private _processFile(
    hasteMap: InternalHasteMap,
    map: ModuleMapData,
    mocks: MockData,
    filePath: Config.Path,
    workerOptions?: {forceInBand: boolean},
  ): Promise<void> | null {
    const rootDir = this._options.rootDir;

    const setModule = (id: string, module: ModuleMetaData) => {
      let moduleMap = map.get(id);
      if (!moduleMap) {
        moduleMap = Object.create(null) as {};
        map.set(id, moduleMap);
      }
      const platform =
        getPlatformExtension(module[H.PATH], this._options.platforms) ||
        H.GENERIC_PLATFORM;

      const existingModule = moduleMap[platform];

      if (existingModule && existingModule[H.PATH] !== module[H.PATH]) {
        const method = this._options.throwOnModuleCollision ? 'error' : 'warn';

        this._console[method](
          [
            'jest-haste-map: Haste module naming collision: ' + id,
            '  The following files share their name; please adjust your hasteImpl:',
            '    * <rootDir>' + path.sep + existingModule[H.PATH],
            '    * <rootDir>' + path.sep + module[H.PATH],
            '',
          ].join('\n'),
        );

        if (this._options.throwOnModuleCollision) {
          throw new DuplicateError(existingModule[H.PATH], module[H.PATH]);
        }

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
    const workerReply = (metadata: ExtractedFileMetaData) => {
      // `1` for truthy values instead of `true` to save cache space.
      fileMetadata[H.VISITED] = 1;

      const metadataId = metadata.id;
      const metadataModule = metadata.module;

      if (metadataId && metadataModule) {
        fileMetadata[H.ID] = metadataId;
        setModule(metadataId, metadataModule);
      }

      fileMetadata[H.DEPENDENCIES] = metadata.dependencies
        ? metadata.dependencies.join(H.DEPENDENCY_DELIM)
        : '';

      if (computeSha1) {
        fileMetadata[H.SHA1] = metadata.sha1;
      }
    };

    // Callback called when the response from the worker is an error.
    const workerError = (error: Error | any) => {
      if (typeof error !== 'object' || !error.message || !error.stack) {
        error = new Error(error);
        error.stack = ''; // Remove stack for stack-less errors.
      }

      if (!['ENOENT', 'EACCES'].includes(error.code)) {
        throw error;
      }

      // If a file cannot be read we remove it from the file list and
      // ignore the failure silently.
      hasteMap.files.delete(relativeFilePath);
    };

    // If we retain all files in the virtual HasteFS representation, we avoid
    // reading them if they aren't important (node_modules).
    if (this._options.retainAllFiles && filePath.includes(NODE_MODULES)) {
      if (computeSha1) {
        return this._getMetadataExtractor(workerOptions)
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
        const secondMockPath = fastPath.relative(rootDir, filePath);
        if (existingMockPath !== secondMockPath) {
          const method = this._options.throwOnModuleCollision
            ? 'error'
            : 'warn';

          this._console[method](
            [
              'jest-haste-map: duplicate manual mock found: ' + mockPath,
              '  The following files share their name; please delete one of them:',
              '    * <rootDir>' + path.sep + existingMockPath,
              '    * <rootDir>' + path.sep + secondMockPath,
              '',
            ].join('\n'),
          );

          if (this._options.throwOnModuleCollision) {
            throw new DuplicateError(existingMockPath, secondMockPath);
          }
        }
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
          modulesByPlatform = Object.create(null) as {};
          map.set(moduleId, modulesByPlatform);
        }
        modulesByPlatform[platform] = module;

        return null;
      }
    }

    return this._getMetadataExtractor(workerOptions)
      .extractMetadata({
        computeDependencies: this._options.computeDependencies,
        computeSha1,
        dependencyExtractor: this._options.dependencyExtractor,
        filePath,
        hasteImplModulePath: this._options.hasteImplModulePath,
        rootDir,
      })
      .then(workerReply, workerError);
  }

  private _buildHasteMap(data: {
    removedFiles: FileData;
    changedFiles?: FileData;
    hasteMap: InternalHasteMap;
  }): Promise<InternalHasteMap> {
    const {removedFiles, changedFiles, hasteMap} = data;

    // If any files were removed or we did not track what files changed, process
    // every file looking for changes. Otherwise, process only changed files.
    let map: ModuleMapData;
    let mocks: MockData;
    let filesToProcess: FileData;
    if (changedFiles === undefined || removedFiles.size) {
      map = new Map();
      mocks = new Map();
      filesToProcess = hasteMap.files;
    } else {
      map = hasteMap.map;
      mocks = hasteMap.mocks;
      filesToProcess = changedFiles;
    }

    for (const [relativeFilePath, fileMetadata] of removedFiles) {
      this._recoverDuplicates(hasteMap, relativeFilePath, fileMetadata[H.ID]);
    }

    const promises = [];
    for (const relativeFilePath of filesToProcess.keys()) {
      if (
        this._options.skipPackageJson &&
        relativeFilePath.endsWith(PACKAGE_JSON)
      ) {
        continue;
      }
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

    return Promise.all(promises).then(
      () => {
        this._cleanup();
        hasteMap.map = map;
        hasteMap.mocks = mocks;
        return hasteMap;
      },
      error => {
        this._cleanup();
        throw error;
      },
    );
  }

  private _cleanup() {
    const metadataExtractor = this._options.metadataExtractor;

    if (metadataExtractor != null) {
      metadataExtractor.end();
    }

    this._metadataExtractorInitialized = false;
  }

  /**
   * 4. serialize the new `HasteMap` in a cache file.
   */
  private _persist(hasteMap: InternalHasteMap) {
    serializer.writeFileSync(this._cachePath, hasteMap);
  }

  private _getMetadataExtractor(
    options = {forceInBand: false},
  ): MetadataExtractor {
    if (!this._metadataExtractorInitialized) {
      this._options.metadataExtractor.setup(options);
    }

    return this._options.metadataExtractor;
  }

  private _crawl(hasteMap: InternalHasteMap) {
    const options = this._options;
    const ignore = this._ignore.bind(this);
    const crawl =
      canUseWatchman && this._options.useWatchman ? watchmanCrawl : nodeCrawl;
    const crawlerOptions: CrawlerOptions = {
      computeSha1: options.computeSha1,
      data: hasteMap,
      extensions: options.extensions,
      forceNodeFilesystemAPI: options.forceNodeFilesystemAPI,
      ignore,
      rootDir: options.rootDir,
      roots: options.roots,
    };

    const retry = (error: Error) => {
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
        return nodeCrawl(crawlerOptions).catch(e => {
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
      return crawl(crawlerOptions).catch(retry);
    } catch (error) {
      return retry(error);
    }
  }

  /**
   * Watch mode
   */
  private _watch(hasteMap: InternalHasteMap): Promise<void> {
    if (!this._options.watch) {
      return Promise.resolve();
    }

    // In watch mode, we'll only warn about module collisions and we'll retain
    // all files, even changes to node_modules.
    this._options.throwOnModuleCollision = false;
    this._options.retainAllFiles = true;

    // WatchmanWatcher > FSEventsWatcher > sane.NodeWatcher
    const Watcher =
      canUseWatchman && this._options.useWatchman
        ? WatchmanWatcher
        : FSEventsWatcher.isSupported()
        ? FSEventsWatcher
        : NodeWatcher;

    const extensions = this._options.extensions;
    const ignorePattern = this._options.ignorePattern;
    const rootDir = this._options.rootDir;

    let changeQueue: Promise<null | void> = Promise.resolve();
    let eventsQueue: EventsQueue = [];
    // We only need to copy the entire haste map once on every "frame".
    let mustCopy = true;

    const createWatcher = (root: Config.Path): Promise<Watcher> => {
      const watcher = new Watcher(root, {
        dot: true,
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
        const changeEvent: ChangeEvent = {
          eventsQueue,
          hasteFS: new HasteFS({files: hasteMap.files, rootDir}),
          moduleMap: new HasteModuleMap({
            duplicates: hasteMap.duplicates,
            map: hasteMap.map,
            mocks: hasteMap.mocks,
            rootDir,
          }),
        };
        this.emit('change', changeEvent);
        eventsQueue = [];
      }
    };

    const onChange = (
      type: string,
      filePath: Config.Path,
      root: Config.Path,
      stat?: Stats,
    ) => {
      filePath = path.join(root, normalizePathSep(filePath));
      if (
        (stat && stat.isDirectory()) ||
        this._ignore(filePath) ||
        !extensions.some(extension => filePath.endsWith(extension))
      ) {
        return;
      }

      const relativeFilePath = fastPath.relative(rootDir, filePath);
      const fileMetadata = hasteMap.files.get(relativeFilePath);

      // The file has been accessed, not modified
      if (
        type === 'change' &&
        fileMetadata &&
        stat &&
        fileMetadata[H.MTIME] === stat.mtime.getTime()
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
                  (!!event.stat &&
                    !!stat &&
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

          const add = () => {
            eventsQueue.push({filePath, stat, type});
            return null;
          };

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
            const fileMetadata: FileMetaData = [
              '',
              stat.mtime.getTime(),
              stat.size,
              0,
              '',
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
        .catch((error: Error) => {
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
  private _recoverDuplicates(
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
      dedupMap = Object.create(null) as {};
      hasteMap.map.set(moduleName, dedupMap);
    }
    dedupMap[platform] = uniqueModule;
    dupsByPlatform.delete(platform);
    if (dupsByPlatform.size === 0) {
      hasteMap.duplicates.delete(moduleName);
    }
  }

  async end(): Promise<void> {
    if (this._changeInterval) {
      clearInterval(this._changeInterval);
    }

    if (!this._watchers.length) {
      return;
    }

    await Promise.all(this._watchers.map(watcher => watcher.close()));

    this._watchers = [];
  }

  /**
   * Helpers
   */
  private _ignore(filePath: Config.Path): boolean {
    const ignorePattern = this._options.ignorePattern;
    const ignoreMatched =
      ignorePattern instanceof RegExp
        ? ignorePattern.test(filePath)
        : ignorePattern && ignorePattern(filePath);

    return (
      ignoreMatched ||
      (!this._options.retainAllFiles && filePath.includes(NODE_MODULES))
    );
  }

  private _createEmptyMap(): InternalHasteMap {
    return {
      clocks: new Map(),
      duplicates: new Map(),
      files: new Map(),
      map: new Map(),
      mocks: new Map(),
    };
  }

  static H = H;
}

export class DuplicateError extends Error {
  mockPath1: string;
  mockPath2: string;

  constructor(mockPath1: string, mockPath2: string) {
    super('Duplicated files or mocks. Please check the console for more info');

    this.mockPath1 = mockPath1;
    this.mockPath2 = mockPath2;
  }
}

function copy<T extends Record<string, unknown>>(object: T): T {
  return Object.assign(Object.create(null), object);
}

function copyMap<K, V>(input: Map<K, V>): Map<K, V> {
  return new Map(input);
}
