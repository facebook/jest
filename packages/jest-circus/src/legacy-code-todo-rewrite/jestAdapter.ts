/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import {Config} from '@jest/types';
import {JestEnvironment} from '@jest/environment';
import {TestResult} from '@jest/test-result';
import Runtime = require('jest-runtime');
import {SnapshotStateType} from 'jest-snapshot';

const FRAMEWORK_INITIALIZER = require.resolve('./jestAdapterInit');

const jestAdapter = async (
  globalConfig: Config.GlobalConfig,
  config: Config.ProjectConfig,
  environment: JestEnvironment,
  runtime: Runtime,
  testPath: string,
  sendMessageToJest?: Function,
): Promise<TestResult> => {
  const {
    initialize,
    runAndTransformResultsToJestFormat,
  } = runtime.requireInternalModule(FRAMEWORK_INITIALIZER);

  runtime
    .requireInternalModule(path.resolve(__dirname, './jestExpect.js'))
    .default({
      expand: globalConfig.expand,
    });

  const getPrettier = () =>
    config.prettierPath ? require(config.prettierPath) : null;
  const getBabelTraverse = () => require('@babel/traverse').default;

  const {globals, snapshotState} = initialize({
    config,
    environment,
    getBabelTraverse,
    getPrettier,
    globalConfig,
    localRequire: runtime.requireModule.bind(runtime),
    parentProcess: process,
    sendMessageToJest,
    testPath,
  });

  if (config.timers === 'fake') {
    // during setup, this cannot be null (and it's fine to explode if it is)
    environment.fakeTimers!.useFakeTimers();
  }

  globals.beforeEach(() => {
    if (config.resetModules) {
      runtime.resetModules();
    }

    if (config.clearMocks) {
      runtime.clearAllMocks();
    }

    if (config.resetMocks) {
      runtime.resetAllMocks();

      if (config.timers === 'fake') {
        // during setup, this cannot be null (and it's fine to explode if it is)
        environment.fakeTimers!.useFakeTimers();
      }
    }

    if (config.restoreMocks) {
      runtime.restoreAllMocks();
    }
  });

  config.setupFilesAfterEnv.forEach(path => runtime.requireModule(path));

  runtime.requireModule(testPath);
  const results = await runAndTransformResultsToJestFormat({
    config,
    globalConfig,
    testPath,
  });
  return _addSnapshotData(results, snapshotState);
};

const _addSnapshotData = (
  results: TestResult,
  snapshotState: SnapshotStateType,
) => {
  results.testResults.forEach(({fullName, status}) => {
    if (status === 'pending' || status === 'failed') {
      // if test is skipped or failed, we don't want to mark
      // its snapshots as obsolete.
      snapshotState.markSnapshotsAsCheckedForTest(fullName);
    }
  });

  const uncheckedCount = snapshotState.getUncheckedCount();
  const uncheckedKeys = snapshotState.getUncheckedKeys();
  if (uncheckedCount) {
    snapshotState.removeUncheckedKeys();
  }

  const status = snapshotState.save();
  results.snapshot.fileDeleted = status.deleted;
  results.snapshot.added = snapshotState.added;
  results.snapshot.matched = snapshotState.matched;
  results.snapshot.unmatched = snapshotState.unmatched;
  results.snapshot.updated = snapshotState.updated;
  results.snapshot.unchecked = !status.deleted ? uncheckedCount : 0;
  // Copy the array to prevent memory leaks
  results.snapshot.uncheckedKeys = Array.from(uncheckedKeys);
  return results;
};

export = jestAdapter;
