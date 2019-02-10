/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export type Path = string;

export type Options = {
  lastCommit?: boolean;
  withAncestor?: boolean;
  changedSince?: string;
  includePaths?: Array<Path>;
};

export type ChangedFiles = Set<Path>;
export type Repos = {git: Set<Path>; hg: Set<Path>};
export type ChangedFilesPromise = Promise<{
  repos: Repos;
  changedFiles: ChangedFiles;
}>;

export type SCMAdapter = {
  findChangedFiles: (cwd: Path, options: Options) => Promise<Array<Path>>;
  getRoot: (cwd: Path) => Promise<Path | null | undefined>;
};
