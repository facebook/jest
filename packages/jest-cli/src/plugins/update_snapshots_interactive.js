/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {JestHookSubscriber} from 'types/JestHooks';
import type {GlobalConfig} from 'types/Config';
import type {AggregatedResult, AssertionLocation} from 'types/TestResult';
import {BaseWatchPlugin} from 'jest-watcher';
import SnapshotInteractiveMode from '../SnapshotInteractiveMode';

class UpdateSnapshotInteractivePlugin extends BaseWatchPlugin {
  _snapshotInteractiveMode: SnapshotInteractiveMode;
  _failedSnapshotTestPaths: Array<*>;
  _failedSnapshotTestAssertions: Array<AssertionLocation>;
  isInternal: true;

  constructor(options: {
    stdin: stream$Readable | tty$ReadStream,
    stdout: stream$Writable | tty$WriteStream,
  }) {
    super(options);
    this._failedSnapshotTestAssertions = [];
    this._snapshotInteractiveMode = new SnapshotInteractiveMode(this._stdout);
    this.isInternal = true;
  }

  getFailedSnapshotTestAssertions(
    testResults: AggregatedResult,
  ): Array<AssertionLocation> {
    const failedTestPaths = [];
    if (testResults.numFailedTests === 0 || !testResults.testResults) {
      return failedTestPaths;
    }

    testResults.testResults.forEach(testResult => {
      if (testResult.snapshot && testResult.snapshot.unmatched) {
        testResult.testResults.forEach(result => {
          if (result.status === 'failed') {
            failedTestPaths.push({
              fullName: result.fullName,
              path: testResult.testFilePath,
            });
          }
        });
      }
    });

    return failedTestPaths;
  }

  apply(hooks: JestHookSubscriber) {
    hooks.onTestRunComplete(results => {
      this._failedSnapshotTestAssertions = this.getFailedSnapshotTestAssertions(
        results,
      );
      if (this._snapshotInteractiveMode.isActive()) {
        this._snapshotInteractiveMode.updateWithResults(results);
      }
    });
  }

  onKey(key: string) {
    if (this._snapshotInteractiveMode.isActive()) {
      this._snapshotInteractiveMode.put(key);
    }
  }

  run(globalConfig: GlobalConfig, updateConfigAndRun: Function): Promise<void> {
    if (this._failedSnapshotTestAssertions.length) {
      return new Promise(res => {
        this._snapshotInteractiveMode.run(
          this._failedSnapshotTestAssertions,
          (assertion: ?AssertionLocation, shouldUpdateSnapshot: boolean) => {
            updateConfigAndRun({
              mode: 'watch',
              testNamePattern: assertion ? `^${assertion.fullName}$` : '',
              testPathPattern: assertion ? assertion.path : '',

              updateSnapshot: shouldUpdateSnapshot ? 'all' : 'none',
            });
            if (!this._snapshotInteractiveMode.isActive()) {
              res();
            }
          },
        );
      });
    } else {
      return Promise.resolve();
    }
  }

  getUsageInfo(globalConfig: GlobalConfig) {
    if (
      this._failedSnapshotTestAssertions &&
      this._failedSnapshotTestAssertions.length > 0
    ) {
      return {
        key: 'i',
        prompt: 'update failing snapshots interactively',
      };
    }

    return null;
  }
}

export default UpdateSnapshotInteractivePlugin;
