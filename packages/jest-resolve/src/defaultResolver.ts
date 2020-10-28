/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as fs from 'graceful-fs';
import {Opts as ResolveOpts, sync as resolveSync} from 'resolve';
import pnpResolver from 'jest-pnp-resolver';
import {tryRealpath} from 'jest-util';
import type {Config} from '@jest/types';

type ResolverOptions = {
  allowPnp?: boolean;
  basedir: Config.Path;
  browser?: boolean;
  defaultResolver: typeof defaultResolver;
  extensions?: Array<string>;
  moduleDirectory?: Array<string>;
  paths?: Array<Config.Path>;
  rootDir?: Config.Path;
  packageFilter?: ResolveOpts['packageFilter'];
};

export default function defaultResolver(
  path: Config.Path,
  options: ResolverOptions,
): Config.Path {
  if (process.versions.pnp && options.allowPnp !== false) {
    return pnpResolver(path, options);
  }

  const result = resolveSync(path, {
    basedir: options.basedir,
    extensions: options.extensions,
    isDirectory,
    isFile,
    moduleDirectory: options.moduleDirectory,
    packageFilter: options.packageFilter,
    paths: options.paths,
    preserveSymlinks: false,
    realpathSync,
  });

  // Dereference symlinks to ensure we don't create a separate
  // module instance depending on how it was referenced.
  return realpathSync(result);
}

export function clearDefaultResolverCache(): void {
  checkedPaths.clear();
  checkedRealpathPaths.clear();
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

/*
 * helper functions
 */
function isFile(file: Config.Path): boolean {
  return statSyncCached(file) === IPathType.FILE;
}

function isDirectory(dir: Config.Path): boolean {
  return statSyncCached(dir) === IPathType.DIRECTORY;
}

function realpathSync(file: Config.Path): Config.Path {
  return realpathCached(file);
}
