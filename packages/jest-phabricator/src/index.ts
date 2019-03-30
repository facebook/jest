/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {AggregatedResult, CoverageMap} from '@jest/test-result';

function summarize(
  coverageMap: CoverageMap,
): {[key: string]: {[key: string]: unknown}} {
  const summaries = Object.create(null);

  coverageMap.files().forEach(file => {
    const covered = [];
    const lineCoverage = coverageMap.fileCoverageFor(file).getLineCoverage();

    Object.keys(lineCoverage).forEach(lineNumber => {
      const number = parseInt(lineNumber, 10);
      // Line numbers start at one
      covered[number - 1] = lineCoverage[number] ? 'C' : 'U';
    });

    for (let i = 0; i < covered.length; i++) {
      if (!covered[i]) {
        covered[i] = 'N';
      }
    }

    summaries[file] = {
      path: file,
    };
  });

  return summaries;
}

export = function(results: AggregatedResult): AggregatedResult {
  return {
    ...results,
    coverageMap:
      results.coverageMap && typeof results.coverageMap.toJSON === 'function'
        ? summarize(results.coverageMap as CoverageMap)
        : results.coverageMap,
  };
};
