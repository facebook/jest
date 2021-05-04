/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// adapted from jest-diff
import chalk = require('chalk');
import prettyFormat from 'pretty-format';
import {wrappedCircularSerializer} from './complex/circularObjects';
import type {FormatOptions, FormatOptionsNormalized} from './types';

export const noColor = (string: string): string => string;

const DIFF_CONTEXT_DEFAULT = 5;

const OPTIONS_DEFAULT: FormatOptionsNormalized = {
  aAnnotation: 'Expected',
  aColor: chalk.green,
  aIndicator: '-',
  bAnnotation: 'Received',
  bColor: chalk.red,
  bIndicator: '+',
  changeColor: chalk.inverse,
  changeLineTrailingSpaceColor: noColor,
  commonColor: chalk.dim,
  commonIndicator: ' ',
  commonLineTrailingSpaceColor: noColor,
  contextLines: DIFF_CONTEXT_DEFAULT,
  emptyFirstOrLastLinePlaceholder: '',
  expand: true,
  includeChangeCounts: false,
  omitAnnotationLines: false,
  patchColor: chalk.yellow,
  plugins: [],
  serialize: (val: unknown) =>
    prettyFormat(val, {
      plugins: [wrappedCircularSerializer],
    }),
};

const getContextLines = (contextLines?: number): number =>
  typeof contextLines === 'number' &&
  Number.isSafeInteger(contextLines) &&
  contextLines >= 0
    ? contextLines
    : DIFF_CONTEXT_DEFAULT;

// Pure function returns options with all properties.
export const normalizeDiffOptions = (
  options: FormatOptions = {},
): FormatOptionsNormalized => ({
  ...OPTIONS_DEFAULT,
  ...options,
  contextLines: getContextLines(options.contextLines),
});
