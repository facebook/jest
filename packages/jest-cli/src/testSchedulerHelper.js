/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
'use strict';
import type {Test} from 'types/TestRunner';

const SLOW_TEST_TIME = 1000;

export function shouldRunInBand(
  tests: Array<Test>,
  isWatchMode: boolean,
  maxWorkers: number,
  timings: number[],
) {
  // Run in band if we only have one test or one worker available, unless we
  // are using the watch mode, in which case the TTY has to be responsive and
  // we cannot schedule anything in the main thread. Same logic applies to
  // watchAll.
  //
  // If we are confident from previous runs that the tests will finish
  // quickly we also run in band to reduce the overhead of spawning workers.
  const areFastTests = timings.every(timing => timing < SLOW_TEST_TIME);
  // This apply also when runInBand arg present
  // https://github.com/facebook/jest/blob/700e0dadb85f5dc8ff5dac6c7e98956690049734/packages/jest-config/src/getMaxWorkers.js#L14-L17
  const oneWorkerOrLess = maxWorkers <= 1;
  const oneTestOrLess = tests.length <= 1;

  if (isWatchMode) {
    return oneWorkerOrLess || (oneTestOrLess && areFastTests);
  }

  return (
    oneWorkerOrLess ||
    oneTestOrLess ||
    (tests.length <= 20 && timings.length > 0 && areFastTests)
  );
}
