/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path, SnapshotUpdateState} from 'types/Config';

import fs from 'fs';
import {getTopFrame} from 'jest-message-util';
import {
  saveSnapshotFile,
  saveInlineSnapshots,
  getSnapshotData,
  getSnapshotPath,
  keyToTestName,
  serialize,
  testNameToKey,
  unescape,
  type InlineSnapshot,
} from './utils';

export type SnapshotStateOptions = {|
  updateSnapshot: SnapshotUpdateState,
  snapshotPath?: string,
  expand?: boolean,
|};

export default class SnapshotState {
  _counters: Map<string, number>;
  _dirty: boolean;
  _index: number;
  _updateSnapshot: SnapshotUpdateState;
  _snapshotData: {[key: string]: string};
  _snapshotPath: Path;
  _inlineSnapshotData: {[key: string]: InlineSnapshot};
  _testPath: Path;
  _uncheckedKeys: Set<string>;
  added: number;
  expand: boolean;
  matched: number;
  unmatched: number;
  updated: number;

  constructor(testPath: Path, options: SnapshotStateOptions) {
    this._snapshotPath = options.snapshotPath || getSnapshotPath(testPath);
    this._testPath = testPath;
    const {data, dirty} = getSnapshotData(
      this._snapshotPath,
      options.updateSnapshot,
    );
    this._snapshotData = data;
    this._dirty = dirty;
    this._inlineSnapshotData = Object.create(null);
    this._uncheckedKeys = new Set(Object.keys(this._snapshotData));
    this._counters = new Map();
    this._index = 0;
    this.expand = options.expand || false;
    this.added = 0;
    this.matched = 0;
    this.unmatched = 0;
    this._updateSnapshot = options.updateSnapshot;
    this.updated = 0;
  }

  markSnapshotsAsCheckedForTest(testName: string) {
    this._uncheckedKeys.forEach(uncheckedKey => {
      if (keyToTestName(uncheckedKey) === testName) {
        this._uncheckedKeys.delete(uncheckedKey);
      }
    });
  }

  _addSnapshot(key: string, receivedSerialized: string, isInline: boolean) {
    this._dirty = true;
    if (isInline) {
      const stack = new Error().stack.split(/\n/);
      const frame = getTopFrame(stack);
      if (!frame) {
        throw new Error("Jest: Couln't infer stack frame for inline snapshot.");
      }
      this._inlineSnapshotData[key] = {
        frame,
        snapshot: receivedSerialized,
      };
    } else {
      this._snapshotData[key] = receivedSerialized;
    }
  }

  save() {
    const hasExternalSnapshots = Object.keys(this._snapshotData).length;
    const hasInlineSnapshots = Object.keys(this._inlineSnapshotData).length;
    const isEmpty = !hasExternalSnapshots && !hasInlineSnapshots;

    const status = {
      deleted: false,
      saved: false,
    };

    if ((this._dirty || this._uncheckedKeys.size) && !isEmpty) {
      if (hasExternalSnapshots) {
        saveSnapshotFile(this._snapshotData, this._snapshotPath);
      }
      if (hasInlineSnapshots) {
        saveInlineSnapshots(this._inlineSnapshotData, this._testPath);
      }
      status.saved = true;
    } else if (!hasExternalSnapshots && fs.existsSync(this._snapshotPath)) {
      if (this._updateSnapshot === 'all') {
        fs.unlinkSync(this._snapshotPath);
      }
      status.deleted = true;
    }

    return status;
  }

  getUncheckedCount(): number {
    return this._uncheckedKeys.size || 0;
  }

  getUncheckedKeys(): Array<string> {
    return Array.from(this._uncheckedKeys);
  }

  removeUncheckedKeys(): void {
    if (this._updateSnapshot === 'all' && this._uncheckedKeys.size) {
      this._dirty = true;
      this._uncheckedKeys.forEach(key => delete this._snapshotData[key]);
      this._uncheckedKeys.clear();
    }
  }

  match(
    testName: string,
    received: any,
    key?: string,
    inlineSnapshot?: string,
  ) {
    this._counters.set(testName, (this._counters.get(testName) || 0) + 1);
    const count = Number(this._counters.get(testName));
    const isInline = typeof inlineSnapshot === 'string';

    if (!key) {
      key = testNameToKey(testName, count);
    }

    this._uncheckedKeys.delete(key);

    const receivedSerialized = serialize(received);
    const expected = isInline ? inlineSnapshot : this._snapshotData[key];
    const pass = expected === receivedSerialized;
    const hasSnapshot = isInline
      ? inlineSnapshot !== ''
      : this._snapshotData[key] !== undefined;

    if (pass && !isInline) {
      // Executing a snapshot file as JavaScript and writing the strings back
      // when other snapshots have changed loses the proper escaping for some
      // characters. Since we check every snapshot in every test, use the newly
      // generated formatted string.
      // Note that this is only relevant when a snapshot is added and the dirty
      // flag is set.
      this._snapshotData[key] = receivedSerialized;
    }

    // These are the conditions on when to write snapshots:
    //  * There's no snapshot file in a non-CI environment.
    //  * There is a snapshot file and we decided to update the snapshot.
    //  * There is a snapshot file, but it doesn't have this snaphsot.
    // These are the conditions on when not to write snapshots:
    //  * The update flag is set to 'none'.
    //  * There's no snapshot file or a file without this snapshot on a CI environment.
    if (
      (hasSnapshot && this._updateSnapshot === 'all') ||
      ((!hasSnapshot || (!isInline && !fs.existsSync(this._snapshotPath))) &&
        (this._updateSnapshot === 'new' || this._updateSnapshot === 'all'))
    ) {
      if (this._updateSnapshot === 'all') {
        if (!pass) {
          if (hasSnapshot) {
            this.updated++;
          } else {
            this.added++;
          }
          this._addSnapshot(key, receivedSerialized, isInline);
        } else {
          this.matched++;
        }
      } else {
        this._addSnapshot(key, receivedSerialized, isInline);
        this.added++;
      }

      return {
        actual: '',
        count,
        expected: '',
        key,
        pass: true,
      };
    } else {
      if (!pass) {
        this.unmatched++;
        return {
          actual: unescape(receivedSerialized),
          count,
          expected: expected ? unescape(expected) : null,
          key,
          pass: false,
        };
      } else {
        this.matched++;
        return {
          actual: '',
          count,
          expected: '',
          key,
          pass: true,
        };
      }
    }
  }

  fail(testName: string, received: any, key?: string) {
    this._counters.set(testName, (this._counters.get(testName) || 0) + 1);
    const count = Number(this._counters.get(testName));

    if (!key) {
      key = testNameToKey(testName, count);
    }

    this._uncheckedKeys.delete(key);
    this.unmatched++;
    return key;
  }
}
