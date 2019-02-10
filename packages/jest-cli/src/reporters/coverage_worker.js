/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig, ProjectConfig, Path} from 'types/Config';
import type {CoverageReporterOptions} from './coverage_reporter';

import exit from 'exit';
import fs from 'fs';
import generateEmptyCoverage from '../generateEmptyCoverage';
import type {CoverageWorkerResult} from '../generateEmptyCoverage';

export type CoverageWorkerData = {|
  globalConfig: GlobalConfig,
  config: ProjectConfig,
  path: Path,
  options?: CoverageReporterOptions,
|};

export type {CoverageWorkerResult};

// Make sure uncaught errors are logged before we exit.
process.on('uncaughtException', err => {
  console.error(err.stack);
  exit(1);
});

export function worker({
  config,
  globalConfig,
  path,
  options,
}: CoverageWorkerData): ?CoverageWorkerResult {
  return generateEmptyCoverage(
    fs.readFileSync(path, 'utf8'),
    path,
    globalConfig,
    config,
    options && options.changedFiles,
  );
}
