/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {TestResult} from 'types/TestResult';

const chalk = require('chalk');

const {pluralize} = require('./utils');

const ARROW = ' \u203A ';
const DOT = ' \u2022 ';
const FAIL_COLOR = chalk.bold.red;
const SNAPSHOT_ADDED = chalk.bold.green;
const SNAPSHOT_UPDATED = chalk.bold.green;
const SNAPSHOT_OUTDATED = chalk.bold.yellow;

export default (
  snapshot: $PropertyType<TestResult, 'snapshot'>,
  afterUpdate: boolean,
): Array<string> => {
  const statuses = [];

  if (snapshot.added) {
    statuses.push(
      SNAPSHOT_ADDED(
        ARROW + pluralize('snapshot', snapshot.added) + ' written.',
      ),
    );
  }

  if (snapshot.updated) {
    statuses.push(
      SNAPSHOT_UPDATED(
        ARROW + pluralize('snapshot', snapshot.updated) + ' updated.',
      ),
    );
  }

  if (snapshot.unmatched) {
    statuses.push(
      FAIL_COLOR(
        ARROW + pluralize('snapshot', snapshot.unmatched) + ' failed.',
      ),
    );
  }

  if (snapshot.unchecked) {
    if (afterUpdate) {
      statuses.push(
        SNAPSHOT_UPDATED(
          ARROW + pluralize('snapshot', snapshot.unchecked) + ' removed.',
        ),
      );
    } else {
      statuses.push(
        SNAPSHOT_OUTDATED(
          ARROW + pluralize('snapshot', snapshot.unchecked) + ' obsolete',
        ) + '.',
      );
    }

    snapshot.uncheckedKeys.forEach(key => {
      statuses.push(`  ${DOT}${key}`);
    });
  }

  if (snapshot.fileDeleted) {
    statuses.push(SNAPSHOT_UPDATED(ARROW + 'snapshot file removed.'));
  }

  return statuses;
};
