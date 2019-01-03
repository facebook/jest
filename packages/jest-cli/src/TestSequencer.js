/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AggregatedResult} from 'types/TestResult';
import type {Context} from 'types/Context';
import type {Test} from 'types/TestRunner';

import fs from 'fs';
import HasteMap from 'jest-haste-map';

const FAIL = 0;
const SUCCESS = 1;

type Cache = {
  [key: string]: [0 | 1, number],
};

export default class TestSequencer {
  _cache: Map<Context, Cache>;

  constructor() {
    this._cache = new Map();
  }

  _getCachePath(context: Context) {
    const {config} = context;
    return HasteMap.getCacheFilePath(
      config.cacheDirectory,
      'perf-cache-' + config.name,
    );
  }

  _getCache(test: Test) {
    const {context} = test;
    if (!this._cache.has(context) && context.config.cache) {
      const cachePath = this._getCachePath(context);
      try {
        this._cache.set(
          context,
          JSON.parse(fs.readFileSync(cachePath, 'utf8')),
        );
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }

    let cache = this._cache.get(context);
    if (!cache) {
      cache = {};
      this._cache.set(context, cache);
    }

    return cache;
  }

  // When running more tests than we have workers available, sort the tests
  // by size - big test files usually take longer to complete, so we run
  // them first in an effort to minimize worker idle time at the end of a
  // long test run.
  //
  // After a test run we store the time it took to run a test and on
  // subsequent runs we use that to run the slowest tests first, yielding the
  // fastest results.
  sort(tests: Array<Test>): Array<Test> {
    const stats = {};
    const fileSize = test =>
      stats[test.path] || (stats[test.path] = fs.statSync(test.path).size);
    const hasFailed = (cache, test) =>
      cache[test.path] && cache[test.path][0] === FAIL;
    const time = (cache, test) => cache[test.path] && cache[test.path][1];

    tests.forEach(test => (test.duration = time(this._getCache(test), test)));
    return tests.sort((testA, testB) => {
      const cacheA = this._getCache(testA);
      const cacheB = this._getCache(testB);
      const failedA = hasFailed(cacheA, testA);
      const failedB = hasFailed(cacheB, testB);
      const hasTimeA = testA.duration != null;
      if (failedA !== failedB) {
        return failedA ? -1 : 1;
      } else if (hasTimeA != (testB.duration != null)) {
        // Check if only one of two tests has timing information
        return hasTimeA != null ? 1 : -1;
      } else if (testA.duration != null && testB.duration != null) {
        return testA.duration < testB.duration ? 1 : -1;
      } else {
        return fileSize(testA) < fileSize(testB) ? 1 : -1;
      }
    });
  }

  cacheResults(tests: Array<Test>, results: AggregatedResult) {
    const map = Object.create(null);
    tests.forEach(test => (map[test.path] = test));
    results.testResults.forEach(testResult => {
      if (testResult && map[testResult.testFilePath] && !testResult.skipped) {
        const cache = this._getCache(map[testResult.testFilePath]);
        const perf = testResult.perfStats;
        cache[testResult.testFilePath] = [
          testResult.numFailingTests ? FAIL : SUCCESS,
          perf.end - perf.start || 0,
        ];
      }
    });

    this._cache.forEach((cache, context) =>
      fs.writeFileSync(this._getCachePath(context), JSON.stringify(cache)),
    );
  }
}
