/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path} from 'types/Config';

export type Options = {|
  lastCommit?: boolean,
  withAncestor?: boolean,
  changedSince?: string,
  includePaths?: Array<Path>,
|};

export type ChangedFiles = Set<Path>;
export type Repos = {|git: Set<Path>, hg: Set<Path>|};
export type ChangedFilesInfo = {|
  repos: Repos,
  changedFiles: ChangedFiles,
|};
export type ChangedFilesPromise = Promise<ChangedFilesInfo>;

export type SCMAdapter = {|
  findChangedFiles: (cwd: Path, options: Options) => Promise<Array<Path>>,
  getRoot: (cwd: Path) => Promise<?Path>,
|};
