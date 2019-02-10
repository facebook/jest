/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Argv} from 'types/Argv';

import os from 'os';

export default function getMaxWorkers(argv: Argv): number {
  if (argv.runInBand) {
    return 1;
  } else if (argv.maxWorkers) {
    const parsed = parseInt(argv.maxWorkers, 10);

    if (
      typeof argv.maxWorkers === 'string' &&
      argv.maxWorkers.trim().endsWith('%') &&
      parsed > 0 &&
      parsed <= 100
    ) {
      const cpus = os.cpus().length;
      const workers = Math.floor((parsed / 100) * cpus);
      return workers >= 1 ? workers : 1;
    }

    return parsed > 0 ? parsed : 1;
  } else {
    const cpus = os.cpus() ? os.cpus().length : 1;
    return Math.max(argv.watch ? Math.floor(cpus / 2) : cpus - 1, 1);
  }
}
