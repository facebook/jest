/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig, ProjectConfig} from 'types/Config';
import type {ChangedFilesPromise} from 'types/ChangedFiles';
import {getChangedFilesForRoots} from 'jest-changed-files';
import {formatExecError} from 'jest-message-util';
import chalk from 'chalk';

export default (
  globalConfig: GlobalConfig,
  configs: Array<ProjectConfig>,
): ?ChangedFilesPromise => {
  if (globalConfig.onlyChanged) {
    const allRootsForAllProjects = configs.reduce(
      (roots, config) => roots.concat(config.roots || []),
      [],
    );
    return getChangedFilesForRoots(allRootsForAllProjects, {
      changedSince: globalConfig.changedSince,
      lastCommit: globalConfig.lastCommit,
      withAncestor: globalConfig.changedFilesWithAncestor,
    }).catch(e => {
      const message = formatExecError(e, configs[0], {noStackTrace: true})
        .split('\n')
        .filter(line => !line.includes('Command failed:'))
        .join('\n');

      console.error(chalk.red(`\n\n${message}`));

      process.exit(1);

      // We do process.exit, so this is dead code
      return Promise.reject(e);
    });
  }

  return undefined;
};
