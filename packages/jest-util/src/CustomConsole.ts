/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'assert';
import {format} from 'util';
import {Console} from 'console';
import chalk from 'chalk';
import {Console as ConsoleType} from '@jest/types';
import clearLine from './clearLine';

type Formatter = (
  type: ConsoleType.LogType,
  message: ConsoleType.LogMessage,
) => string;

export default class CustomConsole extends Console {
  private _stdout: NodeJS.WritableStream;
  private _formatBuffer: Formatter;
  private _counters: ConsoleType.LogCounters;
  private _timers: ConsoleType.LogTimers;
  private _groupDepth: number;

  constructor(
    stdout: NodeJS.WritableStream,
    stderr: NodeJS.WritableStream,
    formatBuffer: Formatter = (_type, message) => message,
  ) {
    super(stdout, stderr);
    this._stdout = stdout;
    this._formatBuffer = formatBuffer;
    this._counters = {};
    this._timers = {};
    this._groupDepth = 0;
  }

  private _logToParentConsole(message: string) {
    super.log(message);
  }

  private _log(type: ConsoleType.LogType, message: string) {
    clearLine(this._stdout);
    this._logToParentConsole(
      this._formatBuffer(type, '  '.repeat(this._groupDepth) + message),
    );
  }

  assert(value: any, message?: string | Error) {
    try {
      assert(value, message);
    } catch (error) {
      this._log('assert', error.toString());
    }
  }

  count(label: string = 'default') {
    if (!this._counters[label]) {
      this._counters[label] = 0;
    }

    this._log('count', format(`${label}: ${++this._counters[label]}`));
  }

  countReset(label: string = 'default') {
    this._counters[label] = 0;
  }

  debug(firstArg: any, ...args: Array<any>) {
    this._log('debug', format(firstArg, ...args));
  }

  dir(firstArg: any, ...args: Array<any>) {
    this._log('dir', format(firstArg, ...args));
  }

  dirxml(firstArg: any, ...args: Array<any>) {
    this._log('dirxml', format(firstArg, ...args));
  }

  error(firstArg: any, ...args: Array<any>) {
    this._log('error', format(firstArg, ...args));
  }

  group(title?: string, ...args: Array<any>) {
    this._groupDepth++;

    if (title || args.length > 0) {
      this._log('group', chalk.bold(format(title, ...args)));
    }
  }

  groupCollapsed(title?: string, ...args: Array<any>) {
    this._groupDepth++;

    if (title || args.length > 0) {
      this._log('groupCollapsed', chalk.bold(format(title, ...args)));
    }
  }

  groupEnd() {
    if (this._groupDepth > 0) {
      this._groupDepth--;
    }
  }

  info(firstArg: any, ...args: Array<any>) {
    this._log('info', format(firstArg, ...args));
  }

  log(firstArg: any, ...args: Array<any>) {
    this._log('log', format(firstArg, ...args));
  }

  time(label: string = 'default') {
    if (this._timers[label]) {
      return;
    }

    this._timers[label] = new Date();
  }

  timeEnd(label: string = 'default') {
    const startTime = this._timers[label];

    if (startTime) {
      const endTime = new Date().getTime();
      const time = endTime - startTime.getTime();
      this._log('time', format(`${label}: ${time}ms`));
      delete this._timers[label];
    }
  }

  warn(firstArg: any, ...args: Array<any>) {
    this._log('warn', format(firstArg, ...args));
  }

  getBuffer() {
    return null;
  }
}
