/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig, ProjectConfig, Path} from 'types/Config';

import {readInitialCoverage} from 'istanbul-lib-instrument';
import {classes} from 'istanbul-lib-coverage';
import Runtime from 'jest-runtime';

export type CoverageWorkerResult = {|
  coverage: any,
  sourceMapPath: ?string,
|};

const {FileCoverage} = classes;

export default function(
  source: string,
  filename: Path,
  globalConfig: GlobalConfig,
  config: ProjectConfig,
  changedFiles: ?Set<Path>,
): ?CoverageWorkerResult {
  const coverageOptions = {
    changedFiles,
    collectCoverage: globalConfig.collectCoverage,
    collectCoverageFrom: globalConfig.collectCoverageFrom,
    collectCoverageOnlyFrom: globalConfig.collectCoverageOnlyFrom,
  };
  if (Runtime.shouldInstrument(filename, coverageOptions, config)) {
    // Transform file with instrumentation to make sure initial coverage data is well mapped to original code.
    const {code, mapCoverage, sourceMapPath} = new Runtime.ScriptTransformer(
      config,
    ).transformSource(filename, source, true);
    const extracted = readInitialCoverage(code);

    return {
      coverage: new FileCoverage(extracted.coverageData),
      sourceMapPath: mapCoverage ? sourceMapPath : null,
    };
  } else {
    return null;
  }
}
