/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {GlobalConfig} from 'types/Config';
import type {JestHookSubscriber} from 'types/JestHooks';
import {BaseWatchPlugin} from 'jest-watcher';

class UpdateSnapshotsPlugin extends BaseWatchPlugin {
  _hasSnapshotFailure: boolean;
  isInternal: true;

  constructor(options: {
    stdin: stream$Readable | tty$ReadStream,
    stdout: stream$Writable | tty$WriteStream,
  }) {
    super(options);
    this.isInternal = true;
  }

  run(
    globalConfig: GlobalConfig,
    updateConfigAndRun: Function,
  ): Promise<boolean> {
    updateConfigAndRun({updateSnapshot: 'all'});
    return Promise.resolve(false);
  }

  apply(hooks: JestHookSubscriber) {
    hooks.onTestRunComplete(results => {
      this._hasSnapshotFailure = results.snapshot.failure;
    });
  }

  getUsageInfo(globalConfig: GlobalConfig) {
    if (this._hasSnapshotFailure) {
      return {
        key: 'u',
        prompt: 'update failing snapshots',
      };
    }

    return null;
  }
}

export default UpdateSnapshotsPlugin;
