/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type LogMessage = string;

export type LogEntry = {
  message: LogMessage;
  origin: string;
  type: LogType;
};

export type LogCounters = {
  [label: string]: number;
};

export type LogTimers = {
  [label: string]: Date;
};

export type LogType =
  | 'assert'
  | 'count'
  | 'debug'
  | 'dir'
  | 'dirxml'
  | 'error'
  | 'group'
  | 'groupCollapsed'
  | 'info'
  | 'log'
  | 'time'
  | 'warn';

export type ConsoleBuffer = Array<LogEntry>;
