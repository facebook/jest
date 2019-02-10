/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {SnapshotSummary} from 'types/TestResult';
import type {GlobalConfig} from 'types/Config';

import chalk from 'chalk';
import {formatTestPath, pluralize} from './utils';

const ARROW = ' \u203A ';
const DOWN_ARROW = ' \u21B3 ';
const DOT = ' \u2022 ';
const FAIL_COLOR = chalk.bold.red;
const OBSOLETE_COLOR = chalk.bold.yellow;
const SNAPSHOT_ADDED = chalk.bold.green;
const SNAPSHOT_NOTE = chalk.dim;
const SNAPSHOT_REMOVED = chalk.bold.green;
const SNAPSHOT_SUMMARY = chalk.bold;
const SNAPSHOT_UPDATED = chalk.bold.green;

export default (
  snapshots: SnapshotSummary,
  globalConfig: GlobalConfig,
  updateCommand: string,
): Array<string> => {
  const summary = [];
  summary.push(SNAPSHOT_SUMMARY('Snapshot Summary'));
  if (snapshots.added) {
    summary.push(
      SNAPSHOT_ADDED(
        ARROW + pluralize('snapshot', snapshots.added) + ' written ',
      ) + `from ${pluralize('test suite', snapshots.filesAdded)}.`,
    );
  }

  if (snapshots.unmatched) {
    summary.push(
      FAIL_COLOR(
        `${ARROW}${pluralize('snapshot', snapshots.unmatched)} failed`,
      ) +
        ` from ${pluralize('test suite', snapshots.filesUnmatched)}. ` +
        SNAPSHOT_NOTE(
          'Inspect your code changes or ' + updateCommand + ' to update them.',
        ),
    );
  }

  if (snapshots.updated) {
    summary.push(
      SNAPSHOT_UPDATED(
        ARROW + pluralize('snapshot', snapshots.updated) + ' updated ',
      ) + `from ${pluralize('test suite', snapshots.filesUpdated)}.`,
    );
  }

  if (snapshots.filesRemoved) {
    if (snapshots.didUpdate) {
      summary.push(
        SNAPSHOT_REMOVED(
          `${ARROW}${pluralize(
            'snapshot file',
            snapshots.filesRemoved,
          )} removed `,
        ) + `from ${pluralize('test suite', snapshots.filesRemoved)}.`,
      );
    } else {
      summary.push(
        OBSOLETE_COLOR(
          `${ARROW}${pluralize(
            'snapshot file',
            snapshots.filesRemoved,
          )} obsolete `,
        ) +
          `from ${pluralize('test suite', snapshots.filesRemoved)}. ` +
          SNAPSHOT_NOTE(
            `To remove ${
              snapshots.filesRemoved === 1 ? 'it' : 'them all'
            }, ${updateCommand}.`,
          ),
      );
    }
  }

  if (snapshots.unchecked) {
    if (snapshots.didUpdate) {
      summary.push(
        SNAPSHOT_REMOVED(
          `${ARROW}${pluralize('snapshot', snapshots.unchecked)} removed `,
        ) +
          `from ${pluralize(
            'test suite',
            snapshots.uncheckedKeysByFile.length,
          )}.`,
      );
    } else {
      summary.push(
        OBSOLETE_COLOR(
          `${ARROW}${pluralize('snapshot', snapshots.unchecked)} obsolete `,
        ) +
          `from ${pluralize(
            'test suite',
            snapshots.uncheckedKeysByFile.length,
          )}. ` +
          SNAPSHOT_NOTE(
            `To remove ${
              snapshots.unchecked === 1 ? 'it' : 'them all'
            }, ${updateCommand}.`,
          ),
      );
    }

    snapshots.uncheckedKeysByFile.forEach(uncheckedFile => {
      summary.push(
        `  ${DOWN_ARROW}${formatTestPath(
          globalConfig,
          uncheckedFile.filePath,
        )}`,
      );

      uncheckedFile.keys.forEach(key => {
        summary.push(`      ${DOT}${key}`);
      });
    });
  }

  return summary;
};
