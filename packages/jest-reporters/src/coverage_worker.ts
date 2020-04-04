/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as fs from 'fs';
import type {Config} from '@jest/types';
import exit = require('exit');
import type {CoverageReporterSerializedOptions} from './types';

import generateEmptyCoverage, {
  CoverageWorkerResult,
} from './generateEmptyCoverage';

export type CoverageWorkerData = {
  globalConfig: Config.GlobalConfig;
  config: Config.ProjectConfig;
  path: Config.Path;
  options?: CoverageReporterSerializedOptions;
};

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
}: CoverageWorkerData): CoverageWorkerResult | null {
  return generateEmptyCoverage(
    fs.readFileSync(path, 'utf8'),
    {id: path, path},
    globalConfig,
    config,
    options && options.changedFiles && new Set(options.changedFiles),
  );
}
