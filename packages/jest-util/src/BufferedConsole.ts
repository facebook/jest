/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'assert';
import {Console} from 'console';
import {format} from 'util';
import {Writable} from 'readable-stream';
import chalk from 'chalk';
import {Console as ConsoleType, SourceMaps} from '@jest/types';
import getCallsite from './getCallsite';

export default class BufferedConsole extends Console {
  private _buffer: ConsoleType.ConsoleBuffer;
  private _counters: ConsoleType.LogCounters;
  private _timers: ConsoleType.LogTimers;
  private _groupDepth: number;
  private _getSourceMaps: () => SourceMaps.SourceMapRegistry | null | undefined;

  constructor(
    getSourceMaps: () => SourceMaps.SourceMapRegistry | null | undefined,
  ) {
    const buffer: ConsoleType.ConsoleBuffer = [];
    super(
      new Writable({
        write: message =>
          BufferedConsole.write(buffer, 'log', message, null, getSourceMaps()),
      }),
    );
    this._getSourceMaps = getSourceMaps;
    this._buffer = buffer;
    this._counters = {};
    this._timers = {};
    this._groupDepth = 0;
  }

  static write(
    buffer: ConsoleType.ConsoleBuffer,
    type: ConsoleType.LogType,
    message: ConsoleType.LogMessage,
    level?: number | null,
    sourceMaps?: SourceMaps.SourceMapRegistry | null,
  ) {
    const callsite = getCallsite(level != null ? level : 2, sourceMaps);
    const origin = callsite.getFileName() + ':' + callsite.getLineNumber();

    buffer.push({
      message,
      origin,
      type,
    });

    return buffer;
  }

  private _log(type: ConsoleType.LogType, message: ConsoleType.LogMessage) {
    BufferedConsole.write(
      this._buffer,
      type,
      '  '.repeat(this._groupDepth) + message,
      3,
      this._getSourceMaps(),
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

  debug(firstArg: any, ...rest: Array<any>) {
    this._log('debug', format(firstArg, ...rest));
  }

  dir(firstArg: any, ...rest: Array<any>) {
    this._log('dir', format(firstArg, ...rest));
  }

  dirxml(firstArg: any, ...rest: Array<any>) {
    this._log('dirxml', format(firstArg, ...rest));
  }

  error(firstArg: any, ...rest: Array<any>) {
    this._log('error', format(firstArg, ...rest));
  }

  group(title?: string, ...rest: Array<any>) {
    this._groupDepth++;

    if (title || rest.length > 0) {
      this._log('group', chalk.bold(format(title, ...rest)));
    }
  }

  groupCollapsed(title?: string, ...rest: Array<any>) {
    this._groupDepth++;

    if (title || rest.length > 0) {
      this._log('groupCollapsed', chalk.bold(format(title, ...rest)));
    }
  }

  groupEnd() {
    if (this._groupDepth > 0) {
      this._groupDepth--;
    }
  }

  info(firstArg: any, ...rest: Array<any>) {
    this._log('info', format(firstArg, ...rest));
  }

  log(firstArg: any, ...rest: Array<any>) {
    this._log('log', format(firstArg, ...rest));
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
      const endTime = new Date();
      const time = endTime.getTime() - startTime.getTime();
      this._log('time', format(`${label}: ${time}ms`));
      delete this._timers[label];
    }
  }

  warn(firstArg: any, ...rest: Array<any>) {
    this._log('warn', format(firstArg, ...rest));
  }

  getBuffer(): ConsoleType.ConsoleBuffer {
    return this._buffer;
  }
}
