/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {Environment} from 'types/Environment';
import type {GlobalConfig, ProjectConfig} from 'types/Config';
import type {TestResult} from 'types/TestResult';
import type Runtime from 'jest-runtime';

const FRAMEWORK_INITIALIZER = require.resolve('./jestAdapterInit');
import path from 'path';

const jestAdapter = async (
  globalConfig: GlobalConfig,
  config: ProjectConfig,
  environment: Environment,
  runtime: Runtime,
  testPath: string,
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
    getBabelTraverse,
    getPrettier,
    globalConfig,
    localRequire: runtime.requireModule.bind(runtime),
    parentProcess: process,
    testPath,
  });

  if (config.timers === 'fake') {
    environment.fakeTimers.useFakeTimers();
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
        environment.fakeTimers.useFakeTimers();
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

const _addSnapshotData = (results: TestResult, snapshotState) => {
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

module.exports = jestAdapter;
