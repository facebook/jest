/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert = require('assert');
import {Console} from 'console';
import {format, formatWithOptions, inspect, InspectOptions} from 'util';
import chalk = require('chalk');
import {clearLine, formatTime} from 'jest-util';
import type {LogCounters, LogMessage, LogTimers, LogType} from './types';

type Formatter = (type: LogType, message: LogMessage) => string;

export default class CustomConsole extends Console {
  private _stdout: NodeJS.WriteStream;
  private _stderr: NodeJS.WriteStream;
  private _formatBuffer: Formatter;
  private _counters: LogCounters = {};
  private _timers: LogTimers = {};
  private _groupDepth = 0;

  Console: typeof Console = Console;

  constructor(
    stdout: NodeJS.WriteStream,
    stderr: NodeJS.WriteStream,
    formatBuffer: Formatter = (_type, message) => message,
  ) {
    super(stdout, stderr);
    this._stdout = stdout;
    this._stderr = stderr;
    this._formatBuffer = formatBuffer;
  }

  private _log(type: LogType, message: string) {
    clearLine(this._stdout);
    super.log(
      this._formatBuffer(type, '  '.repeat(this._groupDepth) + message),
    );
  }

  private _logError(type: LogType, message: string) {
    clearLine(this._stderr);
    super.error(
      this._formatBuffer(type, '  '.repeat(this._groupDepth) + message),
    );
  }

  assert(value: unknown, message?: string | Error): asserts value {
    try {
      assert(value, message);
    } catch (error) {
      this._logError('assert', error.toString());
    }
  }

  count(label: string = 'default'): void {
    if (!this._counters[label]) {
      this._counters[label] = 0;
    }

    this._log('count', format(`${label}: ${++this._counters[label]}`));
  }

  countReset(label: string = 'default'): void {
    this._counters[label] = 0;
  }

  debug(firstArg: unknown, ...args: Array<unknown>): void {
    this._log('debug', format(firstArg, ...args));
  }

  dir(firstArg: unknown, options: InspectOptions = {}): void {
    const representation = inspect(firstArg, options);
    this._log('dir', formatWithOptions(options, representation));
  }

  dirxml(firstArg: unknown, ...args: Array<unknown>): void {
    this._log('dirxml', format(firstArg, ...args));
  }

  error(firstArg: unknown, ...args: Array<unknown>): void {
    this._logError('error', format(firstArg, ...args));
  }

  group(title?: string, ...args: Array<unknown>): void {
    this._groupDepth++;

    if (title || args.length > 0) {
      this._log('group', chalk.bold(format(title, ...args)));
    }
  }

  groupCollapsed(title?: string, ...args: Array<unknown>): void {
    this._groupDepth++;

    if (title || args.length > 0) {
      this._log('groupCollapsed', chalk.bold(format(title, ...args)));
    }
  }

  groupEnd(): void {
    if (this._groupDepth > 0) {
      this._groupDepth--;
    }
  }

  info(firstArg: unknown, ...args: Array<unknown>): void {
    this._log('info', format(firstArg, ...args));
  }

  log(firstArg: unknown, ...args: Array<unknown>): void {
    this._log('log', format(firstArg, ...args));
  }

  time(label: string = 'default'): void {
    if (this._timers[label]) {
      return;
    }

    this._timers[label] = new Date();
  }

  timeEnd(label: string = 'default'): void {
    const startTime = this._timers[label];

    if (startTime) {
      const endTime = new Date().getTime();
      const time = endTime - startTime.getTime();
      this._log('time', format(`${label}: ${formatTime(time)}`));
      delete this._timers[label];
    }
  }

  timeLog(label = 'default', ...data: Array<unknown>): void {
    const startTime = this._timers[label];

    if (startTime) {
      const endTime = new Date();
      const time = endTime.getTime() - startTime.getTime();
      this._log('time', format(`${label}: ${formatTime(time)}`, ...data));
    }
  }

  warn(firstArg: unknown, ...args: Array<unknown>): void {
    this._logError('warn', format(firstArg, ...args));
  }

  getBuffer(): undefined {
    return undefined;
  }
}
