/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import CustomConsole from './CustomConsole';

export default class NullConsole extends CustomConsole {
  assert() {}
  debug() {}
  dir() {}
  error() {}
  info() {}
  log() {}
  time() {}
  timeEnd() {}
  trace() {}
  warn() {}
}
