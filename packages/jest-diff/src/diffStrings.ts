/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk, {Chalk} from 'chalk';
import diff, {Callbacks} from 'diff-sequences';
import {NO_DIFF_MESSAGE} from './constants';
import {DiffOptions} from './types';

const DIFF_CONTEXT_DEFAULT = 5;

type Original = {
  a: string;
  b: string;
};

const fgPatchMark = chalk.yellow;
const fgDelete = chalk.green;
const fgInsert = chalk.red;
const fgCommon = chalk.dim; // common lines (even indentation same)
const fgIndent = chalk.cyan; // common lines (only indentation different)
const bgCommon = chalk.bgYellow; // edge spaces in common line (even indentation same)
const bgInverse = chalk.inverse; // edge spaces in any other lines

// ONLY trailing if expected value is snapshot or multiline string.
const highlightTrailingSpaces = (line: string, bgColor: Chalk): string =>
  line.replace(/\s+$/, bgColor('$&'));

// BOTH leading AND trailing if expected value is data structure.
const highlightLeadingTrailingSpaces = (line: string, bgColor: Chalk): string =>
  // If line consists of ALL spaces: highlight all of them.
  highlightTrailingSpaces(line, bgColor).replace(
    // If line has an ODD length of leading spaces: highlight only the LAST.
    /^(\s\s)*(\s)(?=[^\s])/,
    '$1' + bgColor('$2'),
  );

type Highlight = (line: string, bgColor: Chalk) => string;

const getHighlightSpaces = (bothEdges: boolean): Highlight =>
  bothEdges ? highlightLeadingTrailingSpaces : highlightTrailingSpaces;

const getAnnotation = (options?: DiffOptions): string =>
  fgDelete('- ' + ((options && options.aAnnotation) || 'Expected')) +
  '\n' +
  fgInsert('+ ' + ((options && options.bAnnotation) || 'Received')) +
  '\n\n';

type Put = (line: string) => void;

// Given index interval in expected lines, put formatted delete lines.
const formatDelete = (
  aStart: number,
  aEnd: number,
  aLinesUn: Array<string>,
  aLinesIn: Array<string>,
  put: Put,
) => {
  const highlightSpaces = getHighlightSpaces(aLinesUn !== aLinesIn);
  for (let aIndex = aStart; aIndex !== aEnd; aIndex += 1) {
    const aLineUn = aLinesUn[aIndex];
    const aLineIn = aLinesIn[aIndex];
    const indentation = aLineIn.slice(0, aLineIn.length - aLineUn.length);

    put(fgDelete('- ' + indentation + highlightSpaces(aLineUn, bgInverse)));
  }
};

// Given index interval in received lines, put formatted insert lines.
const formatInsert = (
  bStart: number,
  bEnd: number,
  bLinesUn: Array<string>,
  bLinesIn: Array<string>,
  put: Put,
) => {
  const highlightSpaces = getHighlightSpaces(bLinesUn !== bLinesIn);
  for (let bIndex = bStart; bIndex !== bEnd; bIndex += 1) {
    const bLineUn = bLinesUn[bIndex];
    const bLineIn = bLinesIn[bIndex];
    const indentation = bLineIn.slice(0, bLineIn.length - bLineUn.length);

    put(fgInsert('+ ' + indentation + highlightSpaces(bLineUn, bgInverse)));
  }
};

// Given the number of items and starting indexes of a common subsequence,
// put formatted common lines.
const formatCommon = (
  nCommon: number,
  aCommon: number,
  bCommon: number,
  // aLinesUn has lines that are equal to bLinesUn within a common subsequence
  aLinesIn: Array<string>,
  bLinesUn: Array<string>,
  bLinesIn: Array<string>,
  put: Put,
) => {
  const highlightSpaces = getHighlightSpaces(bLinesUn !== bLinesIn);
  for (; nCommon !== 0; nCommon -= 1, aCommon += 1, bCommon += 1) {
    const bLineUn = bLinesUn[bCommon];
    const bLineIn = bLinesIn[bCommon];
    const bLineInLength = bLineIn.length;

    // For common lines, received indentation seems more intuitive.
    const indentation = bLineIn.slice(0, bLineInLength - bLineUn.length);

    // Color shows whether expected and received line has same indentation.
    const hasSameIndentation = aLinesIn[aCommon].length === bLineInLength;
    const fg = hasSameIndentation ? fgCommon : fgIndent;
    const bg = hasSameIndentation ? bgCommon : bgInverse;

    put(fg('  ' + indentation + highlightSpaces(bLineUn, bg)));
  }
};

// jest --expand
// Return formatted diff as joined string of all lines.
const diffExpand = (
  aLinesUn: Array<string>,
  bLinesUn: Array<string>,
  aLinesIn: Array<string>,
  bLinesIn: Array<string>,
): string => {
  const isCommon: Callbacks['isCommon'] = (aIndex, bIndex) =>
    aLinesUn[aIndex] === bLinesUn[bIndex];

  const array: string[] = [];
  const put = (line: string) => {
    array.push(line);
  };

  let aStart = 0;
  let bStart = 0;

  const foundSubsequence: Callbacks['foundSubsequence'] = (
    nCommon,
    aCommon,
    bCommon,
  ) => {
    formatDelete(aStart, aCommon, aLinesUn, aLinesIn, put);
    formatInsert(bStart, bCommon, bLinesUn, bLinesIn, put);
    formatCommon(nCommon, aCommon, bCommon, aLinesIn, bLinesUn, bLinesIn, put);
    aStart = aCommon + nCommon;
    bStart = bCommon + nCommon;
  };

  const aLength = aLinesUn.length;
  const bLength = bLinesUn.length;

  diff(aLength, bLength, isCommon, foundSubsequence);

  // After the last common subsequence, format remaining change lines.
  formatDelete(aStart, aLength, aLinesUn, aLinesIn, put);
  formatInsert(bStart, bLength, bLinesUn, bLinesIn, put);

  return array.join('\n');
};

// In GNU diff format, indexes are one-based instead of zero-based.
const createPatchMark = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): string =>
  fgPatchMark(
    `@@ -${aStart + 1},${aEnd - aStart} +${bStart + 1},${bEnd - bStart} @@`,
  );

const getContextLines = (options?: DiffOptions): number =>
  options &&
  typeof options.contextLines === 'number' &&
  options.contextLines >= 0
    ? options.contextLines
    : DIFF_CONTEXT_DEFAULT;

// jest --no-expand
// Return joined string of formatted diff for all change lines,
// but if some common lines are omitted because there are more than the context,
// then a “patch mark” precedes each set of adjacent changed and common lines.
const diffNoExpand = (
  aLinesUn: Array<string>,
  bLinesUn: Array<string>,
  aLinesIn: Array<string>,
  bLinesIn: Array<string>,
  nContextLines: number,
): string => {
  const isCommon: Callbacks['isCommon'] = (aIndex, bIndex) =>
    aLinesUn[aIndex] === bLinesUn[bIndex];

  let iPatchMark = 0; // index of placeholder line for patch mark
  const array = [''];
  const put = (line: string) => {
    array.push(line);
  };

  let isAtEnd = false;
  const aLength = aLinesUn.length;
  const bLength = bLinesUn.length;
  const nContextLines2 = nContextLines + nContextLines;

  // Initialize the first patch for changes at the start,
  // especially for edge case in which there is no common subsequence.
  let aStart = 0;
  let aEnd = 0;
  let bStart = 0;
  let bEnd = 0;

  // Given the number of items and starting indexes of each common subsequence,
  // format any preceding change lines, and then common context lines.
  const foundSubsequence: Callbacks['foundSubsequence'] = (
    nCommon,
    aStartCommon,
    bStartCommon,
  ) => {
    const aEndCommon = aStartCommon + nCommon;
    const bEndCommon = bStartCommon + nCommon;
    isAtEnd = aEndCommon === aLength && bEndCommon === bLength;

    // If common subsequence is at start, re-initialize the first patch.
    if (aStartCommon === 0 && bStartCommon === 0) {
      const nLines = nContextLines < nCommon ? nContextLines : nCommon;
      aStart = aEndCommon - nLines;
      bStart = bEndCommon - nLines;

      formatCommon(nLines, aStart, bStart, aLinesIn, bLinesUn, bLinesIn, put);
      aEnd = aEndCommon;
      bEnd = bEndCommon;
      return;
    }

    // Format preceding change lines.
    formatDelete(aEnd, aStartCommon, aLinesUn, aLinesIn, put);
    formatInsert(bEnd, bStartCommon, bLinesUn, bLinesIn, put);
    aEnd = aStartCommon;
    bEnd = bStartCommon;

    // If common subsequence is at end, then context follows preceding changes;
    // else context follows preceding changes AND precedes following changes.
    const maxContextLines = isAtEnd ? nContextLines : nContextLines2;

    if (nCommon <= maxContextLines) {
      // The patch includes all lines in the common subsequence.
      formatCommon(nCommon, aEnd, bEnd, aLinesIn, bLinesUn, bLinesIn, put);
      aEnd += nCommon;
      bEnd += nCommon;
      return;
    }

    // The patch ends because context is less than number of common lines.
    formatCommon(nContextLines, aEnd, bEnd, aLinesIn, bLinesUn, bLinesIn, put);
    aEnd += nContextLines;
    bEnd += nContextLines;

    array[iPatchMark] = createPatchMark(aStart, aEnd, bStart, bEnd);

    // If common subsequence is not at end, another patch follows it.
    if (!isAtEnd) {
      iPatchMark = array.length; // index of placeholder line
      array[iPatchMark] = '';

      const nLines = nContextLines < nCommon ? nContextLines : nCommon;
      aStart = aEndCommon - nLines;
      bStart = bEndCommon - nLines;

      formatCommon(nLines, aStart, bStart, aLinesIn, bLinesUn, bLinesIn, put);
      aEnd = aEndCommon;
      bEnd = bEndCommon;
    }
  };

  diff(aLength, bLength, isCommon, foundSubsequence);

  // If no common subsequence or last was not at end, format remaining change lines.
  if (!isAtEnd) {
    formatDelete(aEnd, aLength, aLinesUn, aLinesIn, put);
    formatInsert(bEnd, bLength, bLinesUn, bLinesIn, put);
    aEnd = aLength;
    bEnd = bLength;
  }

  if (aStart === 0 && aEnd === aLength && bStart === 0 && bEnd === bLength) {
    array.splice(0, 1); // delete placeholder line for patch mark
  } else {
    array[iPatchMark] = createPatchMark(aStart, aEnd, bStart, bEnd);
  }

  return array.join('\n');
};

export default (
  a: string,
  b: string,
  options?: DiffOptions,
  original?: Original,
): string => {
  if (a === b) {
    return NO_DIFF_MESSAGE;
  }

  let aLinesUn = a.split('\n');
  let bLinesUn = b.split('\n');

  // Indentation is unknown if expected value is snapshot or multiline string.
  let aLinesIn = aLinesUn;
  let bLinesIn = bLinesUn;

  if (original) {
    // Indentation is known if expected value is data structure:
    // Compare lines without indentation and format lines with indentation.
    aLinesIn = original.a.split('\n');
    bLinesIn = original.b.split('\n');

    if (
      aLinesUn.length !== aLinesIn.length ||
      bLinesUn.length !== bLinesIn.length
    ) {
      // Fall back if unindented and indented lines are inconsistent.
      aLinesUn = aLinesIn;
      bLinesUn = bLinesIn;
    }
  }

  return (
    getAnnotation(options) +
    (options && options.expand === false
      ? diffNoExpand(
          aLinesUn,
          bLinesUn,
          aLinesIn,
          bLinesIn,
          getContextLines(options),
        )
      : diffExpand(aLinesUn, bLinesUn, aLinesIn, bLinesIn))
  );
};
