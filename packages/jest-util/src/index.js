/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import mkdirp from 'mkdirp';

import BufferedConsole from './buffered_console';
import clearLine from './clear_line';
import Console from './Console';
import ErrorWithStack from './error_with_stack';
import FakePromises from './fake_promises';
import FakeTimers from './fake_timers';
import formatTestResults from './format_test_results';
import getFailedSnapshotTests from './get_failed_snapshot_tests';
import getConsoleOutput from './get_console_output';
import installCommonGlobals from './install_common_globals';
import NullConsole from './null_console';
import isInteractive from './is_interative';
import getCallsite from './get_callsite';
import setGlobal from './set_global';
import deepCyclicCopy from './deep_cyclic_copy';
import convertDescriptorToString from './convert_descriptor_to_string';

const createDirectory = (path: string) => {
  try {
    mkdirp.sync(path, '777');
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
};

module.exports = {
  BufferedConsole,
  Console,
  ErrorWithStack,
  FakePromises,
  FakeTimers,
  NullConsole,
  clearLine,
  convertDescriptorToString,
  createDirectory,
  deepCyclicCopy,
  formatTestResults,
  getCallsite,
  getConsoleOutput,
  getFailedSnapshotTests,
  installCommonGlobals,
  isInteractive,
  setGlobal,
};
