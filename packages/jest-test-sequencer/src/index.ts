/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as fs from 'graceful-fs';
import type {AggregatedResult} from '@jest/test-result';
import HasteMap from 'jest-haste-map';
import type {Test} from 'jest-runner';
import type {Context} from 'jest-runtime';

const FAIL = 0;
const SUCCESS = 1;

type Cache = {
  [key: string]: [0 | 1, number];
};

/**
 * The TestSequencer will ultimately decide which tests should run first.
 * It is responsible for storing and reading from a local cache
 * map that stores context information for a given test, such as how long it
 * took to run during the last run and if it has failed or not.
 * Such information is used on:
 * TestSequencer.sort(tests: Array<Test>)
 * to sort the order of the provided tests.
 *
 * After the results are collected,
 * TestSequencer.cacheResults(tests: Array<Test>, results: AggregatedResult)
 * is called to store/update this information on the cache map.
 */
export default class TestSequencer {
  private _cache: Map<Context, Cache> = new Map();

  _getCachePath(context: Context): string {
    const {config} = context;
    return HasteMap.getCacheFilePath(
      config.cacheDirectory,
      'perf-cache-' + config.id,
    );
  }

  _getCache(test: Test): Cache {
    const {context} = test;
    if (!this._cache.has(context) && context.config.cache) {
      const cachePath = this._getCachePath(context);
      if (fs.existsSync(cachePath)) {
        try {
          this._cache.set(
            context,
            JSON.parse(fs.readFileSync(cachePath, 'utf8')),
          );
        } catch {}
      }
    }

    let cache = this._cache.get(context);
    if (!cache) {
      cache = {};
      this._cache.set(context, cache);
    }

    return cache;
  }

  /**
   * Sorting tests is very important because it has a great impact on the
   * user-perceived responsiveness and speed of the test run.
   *
   * If such information is on cache, tests are sorted based on:
   * -> Has it failed during the last run ?
   * Since it's important to provide the most expected feedback as quickly
   * as possible.
   * -> How long it took to run ?
   * Because running long tests first is an effort to minimize worker idle
   * time at the end of a long test run.
   * And if that information is not available they are sorted based on file size
   * since big test files usually take longer to complete.
   *
   * Note that a possible improvement would be to analyse other information
   * from the file other than its size.
   *
   */
  sort(tests: Array<Test>): Array<Test> {
    const stats: {[path: string]: number} = {};
    const fileSize = ({path, context: {hasteFS}}: Test) =>
      stats[path] || (stats[path] = hasteFS.getSize(path) || 0);
    const hasFailed = (cache: Cache, test: Test) =>
      cache[test.path] && cache[test.path][0] === FAIL;
    const time = (cache: Cache, test: Test) =>
      cache[test.path] && cache[test.path][1];

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
        // If only one of two tests has timing information, run it last
        return hasTimeA ? 1 : -1;
      } else if (testA.duration != null && testB.duration != null) {
        return testA.duration < testB.duration ? 1 : -1;
      } else {
        return fileSize(testA) < fileSize(testB) ? 1 : -1;
      }
    });
  }

  allFailedTests(tests: Array<Test>): Array<Test> {
    const hasFailed = (cache: Cache, test: Test) =>
      cache[test.path]?.[0] === FAIL;
    return this.sort(
      tests.filter(test => hasFailed(this._getCache(test), test)),
    );
  }

  cacheResults(tests: Array<Test>, results: AggregatedResult): void {
    const map = Object.create(null);
    tests.forEach(test => (map[test.path] = test));
    results.testResults.forEach(testResult => {
      if (testResult && map[testResult.testFilePath] && !testResult.skipped) {
        const cache = this._getCache(map[testResult.testFilePath]);
        const perf = testResult.perfStats;
        cache[testResult.testFilePath] = [
          testResult.numFailingTests ? FAIL : SUCCESS,
          perf.runtime || 0,
        ];
      }
    });

    this._cache.forEach((cache, context) =>
      fs.writeFileSync(this._getCachePath(context), JSON.stringify(cache)),
    );
  }
}
