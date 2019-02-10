/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {WatchPlugin} from './types';

class BaseWatchPlugin implements WatchPlugin {
  _stdin: NodeJS.ReadableStream;
  _stdout: NodeJS.WritableStream;

  constructor({
    stdin,
    stdout,
  }: {
    stdin: NodeJS.ReadableStream;
    stdout: NodeJS.WritableStream;
  }) {
    this._stdin = stdin;
    this._stdout = stdout;
  }

  apply() {}

  getUsageInfo() {
    return null;
  }

  onKey() {}

  run() {
    return Promise.resolve();
  }
}

export default BaseWatchPlugin;
