/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import micromatch from 'micromatch';
import {sync as realpath} from 'realpath-native';
import {replacePathSepForGlob} from 'jest-util';
import {Config} from '@jest/types';
import {FileData, LinkData} from './types';
import * as fastPath from './lib/fast_path';
import H from './constants';

export default class HasteFS {
  private readonly _rootDir: Config.Path;
  private readonly _files: FileData;
  private readonly _links: LinkData;

  constructor({
    rootDir,
    files,
    links,
  }: {
    rootDir: Config.Path;
    files: FileData;
    links: LinkData;
  }) {
    this._rootDir = rootDir;
    this._files = files;
    this._links = links;
  }

  getModuleName(file: Config.Path): string | null {
    const fileMetadata = this._getFileData(file);
    return (fileMetadata && fileMetadata[H.ID]) || null;
  }

  getSize(file: Config.Path): number | null {
    const fileMetadata = this._getFileData(file);
    return (fileMetadata && fileMetadata[H.SIZE]) || null;
  }

  getDependencies(file: Config.Path): Array<string> | null {
    const fileMetadata = this._getFileData(file);
    return (fileMetadata && fileMetadata[H.DEPENDENCIES]) || null;
  }

  getSha1(file: Config.Path): string | null {
    const fileMetadata = this._getFileData(file);
    return (fileMetadata && fileMetadata[H.SHA1]) || null;
  }

  exists(file: Config.Path): boolean {
    return this._getFileData(file) != null;
  }

  follow(file: Config.Path): Config.Path {
    const name = fastPath.relative(this._rootDir, file);
    const link = this._links.get(name);
    if (!link) {
      return file;
    }
    if (!link[0]) {
      const target = realpath(file);
      link[0] = fastPath.relative(this._rootDir, target);
      return target;
    }
    return path.join(this._rootDir, link[0]);
  }

  getAllFiles(): Array<Config.Path> {
    return Array.from(this.getAbsoluteFileIterator());
  }

  getFileIterator(): Iterable<Config.Path> {
    return this._files.keys();
  }

  *getAbsoluteFileIterator(): Iterable<Config.Path> {
    for (const file of this.getFileIterator()) {
      yield fastPath.resolve(this._rootDir, file);
    }
  }

  matchFiles(pattern: RegExp | string): Array<Config.Path> {
    if (!(pattern instanceof RegExp)) {
      pattern = new RegExp(pattern);
    }
    const files = [];
    for (const file of this.getAbsoluteFileIterator()) {
      if (pattern.test(file)) {
        files.push(file);
      }
    }
    return files;
  }

  matchFilesWithGlob(
    globs: Array<Config.Glob>,
    root: Config.Path | null,
  ): Set<Config.Path> {
    const files = new Set();
    for (const file of this.getAbsoluteFileIterator()) {
      const filePath = root ? fastPath.relative(root, file) : file;
      if (micromatch.some(replacePathSepForGlob(filePath), globs)) {
        files.add(file);
      }
    }
    return files;
  }

  private _getFileData(file: Config.Path) {
    const relativePath = fastPath.relative(this._rootDir, file);
    return this._files.get(relativePath);
  }
}
