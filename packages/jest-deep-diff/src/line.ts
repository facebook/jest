/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {Context, Line, LineType} from './types';

export const createCommonLine = (val: string, context: Context): Line => ({
  indent: context.indent || '',
  prefix: context.prefix || '',
  suffix: context.sufix || '',
  type: LineType.COMMON,
  val,
});

export const createInsertedLine = (val: string, context: Context): Line => ({
  indent: context.indent || '',
  prefix: context.prefix || '',
  suffix: context.sufix || '',
  type: LineType.INSERTED,
  val,
});

export const createDeletedLine = (val: string, context: Context): Line => ({
  indent: context.indent || '',
  prefix: context.prefix || '',
  suffix: context.sufix || '',
  type: LineType.DELETED,
  val,
});

export const formatUpdated = (
  valA: string,
  valB: string,
  context: Context,
): Array<Line> => [
  createDeletedLine(valA, context),
  createInsertedLine(valB, context),
];
