/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import path from 'path';
import execa from 'execa';

import {Path, Options, SCMAdapter} from './types';

const findChangedFilesUsingCommand = async (
  args: Array<string>,
  cwd: Path,
): Promise<Array<Path>> => {
  const result = await execa('git', args, {cwd});

  return result.stdout
    .split('\n')
    .filter(s => s !== '')
    .map(changedPath => path.resolve(cwd, changedPath));
};

const adapter: SCMAdapter = {
  findChangedFiles: async (
    cwd: string,
    options?: Options,
  ): Promise<Array<Path>> => {
    const changedSince: string | undefined =
      options && (options.withAncestor ? 'HEAD^' : options.changedSince);

    const includePaths: Array<Path> = (options && options.includePaths) || [];

    if (options && options.lastCommit) {
      return findChangedFilesUsingCommand(
        ['show', '--name-only', '--pretty=%b', 'HEAD'].concat(includePaths),
        cwd,
      );
    } else if (changedSince) {
      const committed = await findChangedFilesUsingCommand(
        [
          'log',
          '--name-only',
          '--pretty=%b',
          'HEAD',
          `^${changedSince}`,
        ].concat(includePaths),
        cwd,
      );
      const staged = await findChangedFilesUsingCommand(
        ['diff', '--cached', '--name-only'].concat(includePaths),
        cwd,
      );
      const unstaged = await findChangedFilesUsingCommand(
        ['ls-files', '--other', '--modified', '--exclude-standard'].concat(
          includePaths,
        ),
        cwd,
      );
      return [...committed, ...staged, ...unstaged];
    } else {
      return findChangedFilesUsingCommand(
        ['ls-files', '--other', '--modified', '--exclude-standard'].concat(
          includePaths,
        ),
        cwd,
      );
    }
  },

  getRoot: async (cwd: string): Promise<string | null> => {
    const options = ['rev-parse', '--show-toplevel'];

    try {
      const result = await execa('git', options, {cwd});

      return result.stdout;
    } catch (e) {
      return null;
    }
  },
};

export default adapter;
