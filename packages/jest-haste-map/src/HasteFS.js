/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Glob, Path} from 'types/Config';
import type {FileData} from 'types/HasteMap';

import {replacePathSepForGlob} from 'jest-util';
import * as fastPath from './lib/fast_path';
import micromatch from 'micromatch';
import H from './constants';

export default class HasteFS {
  _rootDir: Path;
  _files: FileData;

  constructor({rootDir, files}: {rootDir: Path, files: FileData}) {
    this._rootDir = rootDir;
    this._files = files;
  }

  getModuleName(file: Path): ?string {
    const fileMetadata = this._getFileData(file);
    return (fileMetadata && fileMetadata[H.ID]) || null;
  }

  getSize(file: Path): ?number {
    const fileMetadata = this._getFileData(file);
    return (fileMetadata && fileMetadata[H.SIZE]) || null;
  }

  getDependencies(file: Path): ?Array<string> {
    const fileMetadata = this._getFileData(file);
    return (fileMetadata && fileMetadata[H.DEPENDENCIES]) || null;
  }

  getSha1(file: Path): ?string {
    const fileMetadata = this._getFileData(file);
    return (fileMetadata && fileMetadata[H.SHA1]) || null;
  }

  exists(file: Path): boolean {
    return this._getFileData(file) != null;
  }

  getAllFiles(): Array<string> {
    return Array.from(this.getAbsoluteFileIterator());
  }

  getFileIterator(): Iterator<string> {
    return this._files.keys();
  }

  *getAbsoluteFileIterator(): Iterator<string> {
    for (const file of this._files.keys()) {
      yield fastPath.resolve(this._rootDir, file);
    }
  }

  matchFiles(pattern: RegExp | string): Array<Path> {
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

  matchFilesWithGlob(globs: Array<Glob>, root: ?Path): Set<Path> {
    const files = new Set();
    for (const file of this.getAbsoluteFileIterator()) {
      const filePath = root ? fastPath.relative(root, file) : file;
      if (micromatch.some(replacePathSepForGlob(filePath), globs)) {
        files.add(file);
      }
    }
    return files;
  }

  _getFileData(file: Path) {
    const relativePath = fastPath.relative(this._rootDir, file);
    return this._files.get(relativePath);
  }
}
