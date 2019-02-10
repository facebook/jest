/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import throat from 'throat';

import {Path, ChangedFilesPromise, Options, Repos} from './types';
import git from './git';
import hg from './hg';

// This is an arbitrary number. The main goal is to prevent projects with
// many roots (50+) from spawning too many processes at once.
const mutex = throat(5);

const findGitRoot = (dir: string) => mutex(() => git.getRoot(dir));
const findHgRoot = (dir: string) => mutex(() => hg.getRoot(dir));

export const getChangedFilesForRoots = async (
  roots: Path[],
  options: Options,
): ChangedFilesPromise => {
  const repos = await findRepos(roots);

  const changedFilesOptions = {includePaths: roots, ...options};

  const gitPromises = Array.from(repos.git).map(repo =>
    git.findChangedFiles(repo, changedFilesOptions),
  );

  const hgPromises = Array.from(repos.hg).map(repo =>
    hg.findChangedFiles(repo, changedFilesOptions),
  );

  const changedFiles = (await Promise.all(
    gitPromises.concat(hgPromises),
  )).reduce((allFiles, changedFilesInTheRepo) => {
    for (const file of changedFilesInTheRepo) {
      allFiles.add(file);
    }

    return allFiles;
  }, new Set());

  return {changedFiles, repos};
};

export const findRepos = async (roots: Path[]): Promise<Repos> => {
  const gitRepos = await Promise.all(
    roots.reduce<Promise<string | null | undefined>[]>(
      (promises, root) => promises.concat(findGitRoot(root)),
      [],
    ),
  );
  const hgRepos = await Promise.all(
    roots.reduce<Promise<string | null | undefined>[]>(
      (promises, root) => promises.concat(findHgRoot(root)),
      [],
    ),
  );

  return {
    git: new Set(gitRepos.filter(Boolean) as string[]),
    hg: new Set(hgRepos.filter(Boolean) as string[]),
  };
};
