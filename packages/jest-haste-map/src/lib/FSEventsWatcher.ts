/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import fs from 'fs';
import path from 'path';
import {EventEmitter} from 'events';
import anymatch from 'anymatch';
import micromatch from 'micromatch';
import {Watcher} from 'fsevents';
// @ts-ignore no types
import walker from 'walker';

let fsevents: (path: string) => Watcher;
try {
  fsevents = require('fsevents');
} catch (e) {
  // Optional dependency, only supported on Darwin.
}

const CHANGE_EVENT = 'change';
const DELETE_EVENT = 'delete';
const ADD_EVENT = 'add';
const ALL_EVENT = 'all';

type FsEventsWatcherEvent =
  | typeof CHANGE_EVENT
  | typeof DELETE_EVENT
  | typeof ADD_EVENT
  | typeof ALL_EVENT;

/**
 * Export `FSEventsWatcher` class.
 * Watches `dir`.
 */
class FSEventsWatcher extends EventEmitter {
  public readonly root: string;
  public readonly ignored?: anymatch.Matcher;
  public readonly glob: Array<string>;
  public readonly dot: boolean;
  public readonly hasIgnore: boolean;
  public readonly doIgnore: (path: string) => boolean;
  public readonly watcher: Watcher;
  private _tracked: Set<string>;

  static isSupported() {
    return fsevents !== undefined;
  }

  private static normalizeProxy(
    callback: (normalizedPath: string, stats: fs.Stats) => void,
  ) {
    return (filepath: string, stats: fs.Stats) =>
      callback(path.normalize(filepath), stats);
  }

  private static recReaddir(
    dir: string,
    dirCallback: (normalizedPath: string, stats: fs.Stats) => void,
    fileCallback: (normalizedPath: string, stats: fs.Stats) => void,
    endCallback: Function,
    errorCallback: Function,
    ignored?: anymatch.Matcher,
  ) {
    walker(dir)
      .filterDir(
        (currentDir: string) => !ignored || !anymatch(ignored, currentDir),
      )
      .on('dir', FSEventsWatcher.normalizeProxy(dirCallback))
      .on('file', FSEventsWatcher.normalizeProxy(fileCallback))
      .on('error', errorCallback)
      .on('end', () => {
        endCallback();
      });
  }

  constructor(
    dir: string,
    opts: {
      root: string;
      ignored?: anymatch.Matcher;
      glob: string | Array<string>;
      dot: boolean;
    },
  ) {
    if (!fsevents) {
      throw new Error(
        '`fsevents` unavailable (this watcher can only be used on Darwin)',
      );
    }

    super();

    this.dot = opts.dot || false;
    this.ignored = opts.ignored;
    this.glob = Array.isArray(opts.glob) ? opts.glob : [opts.glob];

    this.hasIgnore =
      Boolean(opts.ignored) && !(Array.isArray(opts) && opts.length > 0);
    this.doIgnore = opts.ignored ? anymatch(opts.ignored) : () => false;

    this.root = path.resolve(dir);
    this.watcher = fsevents(this.root);

    this.watcher.start().on('change', this.handleEvent.bind(this));
    this._tracked = new Set();
    FSEventsWatcher.recReaddir(
      this.root,
      (filepath: string) => {
        this._tracked.add(filepath);
      },
      (filepath: string) => {
        this._tracked.add(filepath);
      },
      this.emit.bind(this, 'ready'),
      this.emit.bind(this, 'error'),
      this.ignored,
    );
  }

  /**
   * End watching.
   */
  close(callback?: () => void) {
    this.watcher.stop();
    this.removeAllListeners();
    if (typeof callback === 'function') {
      process.nextTick(callback.bind(null, null, true));
    }
  }

  private isFileIncluded(relativePath: string) {
    if (this.doIgnore(relativePath)) {
      return false;
    }
    return this.glob.length
      ? micromatch.some(relativePath, this.glob, {dot: this.dot})
      : this.dot || micromatch.some(relativePath, '**/*');
  }

  private handleEvent(filepath: string) {
    const relativePath = path.relative(this.root, filepath);
    if (!this.isFileIncluded(relativePath)) {
      return;
    }

    fs.lstat(filepath, (error, stat) => {
      if (error && error.code !== 'ENOENT') {
        this.emit('error', error);
        return;
      }

      if (error) {
        // Ignore files that aren't tracked and don't exist.
        if (!this._tracked.has(filepath)) {
          return;
        }

        this._emit(DELETE_EVENT, relativePath);
        this._tracked.delete(filepath);
        return;
      }

      if (this._tracked.has(filepath)) {
        this._emit(CHANGE_EVENT, relativePath, stat);
      } else {
        this._tracked.add(filepath);
        this._emit(ADD_EVENT, relativePath, stat);
      }
    });
  }

  /**
   * Emit events.
   */
  private _emit(type: FsEventsWatcherEvent, file: string, stat?: fs.Stats) {
    this.emit(type, file, this.root, stat);
    this.emit(ALL_EVENT, type, file, this.root, stat);
  }
}

export = FSEventsWatcher;
