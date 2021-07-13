/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as fs from 'graceful-fs';
import pnpResolver from 'jest-pnp-resolver';
import {AsyncOpts, SyncOpts, sync as resolveSync} from 'resolve';
import type {Config} from '@jest/types';
import {tryRealpath} from 'jest-util';
// QUESTION: What is a better way to import this?
const resolveAsync = require('resolve/lib/async');

type ResolverOptions = {
  basedir: Config.Path;
  browser?: boolean;
  // QUESTION: Should it also be possible to pass a defaultResolverAsync?
  defaultResolver: typeof defaultResolverSync;
  extensions?: Array<string>;
  moduleDirectory?: Array<string>;
  paths?: Array<Config.Path>;
  rootDir?: Config.Path;
  packageFilter?: (pkg: any, pkgfile: string) => any;
};

// https://github.com/facebook/jest/pull/10617
declare global {
  namespace NodeJS {
    export interface ProcessVersions {
      pnp?: any;
    }
  }
}

export default function defaultResolverSync(
  path: Config.Path,
  options: ResolverOptions,
): Config.Path {
  // Yarn 2 adds support to `resolve` automatically so the pnpResolver is only
  // needed for Yarn 1 which implements version 1 of the pnp spec
  if (process.versions.pnp === '1') {
    return pnpResolver(path, options);
  }

  const result = resolveSync(path, getSyncResolveOptions(options));

  // Dereference symlinks to ensure we don't create a separate
  // module instance depending on how it was referenced.
  return realpathSync(result);
}

export function defaultResolverAsync(
  path: Config.Path,
  options: ResolverOptions,
): Promise<Config.Path> {
  // Yarn 2 adds support to `resolve` automatically so the pnpResolver is only
  // needed for Yarn 1 which implements version 1 of the pnp spec
  if (process.versions.pnp === '1') {
    // QUESTION: do we need an async version of pnpResolver?
    return Promise.resolve(pnpResolver(path, options));
  }

  return new Promise((resolve, reject) => {
    function resolveCb(err: Error | null, result?: string) {
      if (err) {
        reject(err);
      }
      if (result) {
        resolve(realpathSync(result));
      }
    }
    const opts = getAsyncResolveOptions(options);
    resolveAsync(path, opts, resolveCb);
  });
}

/**
 * getBaseResolveOptions returns resolution options that are shared by both the
 * synch and async resolution functions.
 */
function getBaseResolveOptions(options: ResolverOptions) {
  return {
    basedir: options.basedir,
    extensions: options.extensions,
    moduleDirectory: options.moduleDirectory,
    packageFilter: options.packageFilter,
    paths: options.paths,
    preserveSymlinks: false,
  };
}

/**
 * getSyncResolveOptions returns resolution options that are used synchronously.
 */
function getSyncResolveOptions(options: ResolverOptions): SyncOpts {
  return {
    ...getBaseResolveOptions(options),
    isDirectory: isDirectorySync,
    isFile: isFileSync,
    readPackageSync,
    realpathSync,
  };
}

/**
 * getAsyncResolveOptions returns resolution options that are used asynchronously.
 */
function getAsyncResolveOptions(options: ResolverOptions): AsyncOpts {
  return {
    ...getBaseResolveOptions(options),
    isDirectory: isDirectoryAsync,
    isFile: isFileAsync,
    readPackage: readPackageAsync,
    realpath: realpathAsync,
  };
}

export function clearDefaultResolverCache(): void {
  checkedPaths.clear();
  checkedRealpathPaths.clear();
  packageContents.clear();
}

enum IPathType {
  FILE = 1,
  DIRECTORY = 2,
  OTHER = 3,
}
const checkedPaths = new Map<string, IPathType>();
function statSyncCached(path: string): IPathType {
  const result = checkedPaths.get(path);
  if (result !== undefined) {
    return result;
  }

  let stat;
  try {
    stat = fs.statSync(path);
  } catch (e) {
    if (!(e && (e.code === 'ENOENT' || e.code === 'ENOTDIR'))) {
      throw e;
    }
  }

  if (stat) {
    if (stat.isFile() || stat.isFIFO()) {
      checkedPaths.set(path, IPathType.FILE);
      return IPathType.FILE;
    } else if (stat.isDirectory()) {
      checkedPaths.set(path, IPathType.DIRECTORY);
      return IPathType.DIRECTORY;
    }
  }

  checkedPaths.set(path, IPathType.OTHER);
  return IPathType.OTHER;
}

const checkedRealpathPaths = new Map<string, string>();
function realpathCached(path: Config.Path): Config.Path {
  let result = checkedRealpathPaths.get(path);

  if (result !== undefined) {
    return result;
  }

  result = tryRealpath(path);

  checkedRealpathPaths.set(path, result);

  if (path !== result) {
    // also cache the result in case it's ever referenced directly - no reason to `realpath` that as well
    checkedRealpathPaths.set(result, result);
  }

  return result;
}

type PkgJson = Record<string, unknown>;

const packageContents = new Map<string, PkgJson>();
function readPackageCached(path: Config.Path): PkgJson {
  let result = packageContents.get(path);

  if (result !== undefined) {
    return result;
  }

  result = JSON.parse(fs.readFileSync(path, 'utf8')) as PkgJson;

  packageContents.set(path, result);

  return result;
}

/*
 * helper functions
 */
function isFileSync(file: Config.Path): boolean {
  return statSyncCached(file) === IPathType.FILE;
}

function isFileAsync(
  file: Config.Path,
  cb: (err: Error | null, isFile?: boolean) => void,
): void {
  try {
    // QUESTION: do we need an async version of statSyncCached?
    const isFile = statSyncCached(file) === IPathType.FILE;
    cb(null, isFile);
  } catch (err) {
    cb(err);
  }
}

function isDirectorySync(dir: Config.Path): boolean {
  return statSyncCached(dir) === IPathType.DIRECTORY;
}

function isDirectoryAsync(
  dir: Config.Path,
  cb: (err: Error | null, isDir?: boolean) => void,
): void {
  try {
    // QUESTION: do we need an async version of statSyncCached?
    const isDir = statSyncCached(dir) === IPathType.DIRECTORY;
    cb(null, isDir);
  } catch (err) {
    cb(err);
  }
}

function realpathSync(file: Config.Path): Config.Path {
  return realpathCached(file);
}

function realpathAsync(
  file: string,
  cb: (err: Error | null, resolved?: string) => void,
): void {
  try {
    // QUESTION: do we need an async version of realpathCached?
    const resolved = realpathCached(file);
    cb(null, resolved);
  } catch (err) {
    cb(err);
  }
}

function readPackageSync(_: unknown, file: Config.Path): PkgJson {
  return readPackageCached(file);
}

function readPackageAsync(
  _: unknown,
  pkgfile: string,
  cb: (err: Error | null, pkgJson?: Record<string, unknown>) => void,
): void {
  try {
    // QUESTION: do we need an async version of readPackageCached?
    const pkgJson = readPackageCached(pkgfile);
    cb(null, pkgJson);
  } catch (err) {
    cb(err);
  }
}
