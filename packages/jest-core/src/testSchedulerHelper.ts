/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Test} from '@jest/test-result';
import type {Config} from '@jest/types';

const SLOW_TEST_TIME = 1000;

export function shouldRunInBand(
  tests: Array<Test>,
  timings: Array<number>,
  {
    detectOpenHandles,
    maxWorkers,
    watch,
    watchAll,
    runInBand,
  }: Config.GlobalConfig,
): boolean {
  // detectOpenHandles makes no sense without runInBand, because it cannot detect leaks in workers
  if (detectOpenHandles) {
    return true;
  }

  // if global config run in band then the whole project should be run in band
  if (runInBand) {
    return true;
  }

  /*
   * Run in band if we only have one test or one worker available, unless we
   * are using the watch mode, in which case the TTY has to be responsive and
   * we cannot schedule anything in the main thread. Same logic applies to
   * watchAll.
   * Also, if we are confident from previous runs that the tests will finish
   * quickly we also run in band to reduce the overhead of spawning workers.
   * Finally, the user can provide the runInBand argument in the CLI to
   * force running in band.
   * https://github.com/facebook/jest/blob/700e0dadb85f5dc8ff5dac6c7e98956690049734/packages/jest-config/src/getMaxWorkers.js#L14-L17
   */
  const isWatchMode = watch || watchAll;
  const areFastTests = timings.every(timing => timing < SLOW_TEST_TIME);
  const oneWorkerOrLess = maxWorkers <= 1;
  const oneTestOrLess = tests.length <= 1;
  const numProjects = new Set(tests.map(test => test.context.config.name)).size;

  if (isWatchMode) {
    return oneWorkerOrLess || (oneTestOrLess && areFastTests);
  }

  return (
    oneWorkerOrLess ||
    oneTestOrLess ||
    (tests.length <= 20 && timings.length > 0 && areFastTests) ||
    (numProjects === 1 && tests.some(test => test.context.config.runInBand))
  );
}
