/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';

// rootDir and filename must be absolute paths (resolved)
export function relative(rootDir: string, filename: string): string {
  return filename.indexOf(rootDir + path.sep) === 0
    ? filename.substr(rootDir.length + 1)
    : path.relative(rootDir, filename);
}

const INDIRECTION_FRAGMENT = '..' + path.sep;

// rootDir must be an absolute path and relativeFilename must be simple
// (e.g.: foo/bar or ../foo/bar, but never ./foo or foo/../bar)
export function resolve(rootDir: string, relativeFilename: string): string {
  return relativeFilename.indexOf(INDIRECTION_FRAGMENT) === 0
    ? path.resolve(rootDir, relativeFilename)
    : rootDir + path.sep + relativeFilename;
}
