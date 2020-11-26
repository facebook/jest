/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import diff from 'diff-sequences';
import {DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT, Diff} from './cleanupSemantic';
import {
  joinAlignedDiffsExpand,
  joinAlignedDiffsNoExpand,
} from './joinAlignedDiffs';
import {normalizeDiffOptions} from './normalizeDiffOptions';
import type {DiffOptions, DiffOptionsNormalized} from './types';

const isEmptyString = (lines: Array<string>) =>
  lines.length === 1 && lines[0].length === 0;

type ChangeCounts = {
  a: number;
  b: number;
};

const countChanges = (diffs: Array<Diff>): ChangeCounts => {
  let a = 0;
  let b = 0;

  diffs.forEach(diff => {
    switch (diff[0]) {
      case DIFF_DELETE:
        a += 1;
        break;

      case DIFF_INSERT:
        b += 1;
        break;
    }
  });

  return {a, b};
};

const printAnnotation = (
  {
    aAnnotation,
    aColor,
    aIndicator,
    bAnnotation,
    bColor,
    bIndicator,
    includeChangeCounts,
    omitAnnotationLines,
  }: DiffOptionsNormalized,
  changeCounts: ChangeCounts,
): string => {
  if (omitAnnotationLines) {
    return '';
  }

  let aRest = '';
  let bRest = '';

  if (includeChangeCounts) {
    const aCount = String(changeCounts.a);
    const bCount = String(changeCounts.b);

    // Padding right aligns the ends of the annotations.
    const baAnnotationLengthDiff = bAnnotation.length - aAnnotation.length;
    const aAnnotationPadding = ' '.repeat(Math.max(0, baAnnotationLengthDiff));
    const bAnnotationPadding = ' '.repeat(Math.max(0, -baAnnotationLengthDiff));

    // Padding left aligns the ends of the counts.
    const baCountLengthDiff = bCount.length - aCount.length;
    const aCountPadding = ' '.repeat(Math.max(0, baCountLengthDiff));
    const bCountPadding = ' '.repeat(Math.max(0, -baCountLengthDiff));

    aRest =
      aAnnotationPadding + '  ' + aIndicator + ' ' + aCountPadding + aCount;
    bRest =
      bAnnotationPadding + '  ' + bIndicator + ' ' + bCountPadding + bCount;
  }

  return (
    aColor(aIndicator + ' ' + aAnnotation + aRest) +
    '\n' +
    bColor(bIndicator + ' ' + bAnnotation + bRest) +
    '\n\n'
  );
};

export const printDiffLines = (
  diffs: Array<Diff>,
  options: DiffOptionsNormalized,
): string =>
  printAnnotation(options, countChanges(diffs)) +
  (options.expand
    ? joinAlignedDiffsExpand(diffs, options)
    : joinAlignedDiffsNoExpand(diffs, options));

// Compare two arrays of strings line-by-line. Format as comparison lines.
export const diffLinesUnified = (
  aLines: Array<string>,
  bLines: Array<string>,
  options?: DiffOptions,
): string =>
  printDiffLines(
    diffLinesRaw(
      isEmptyString(aLines) ? [] : aLines,
      isEmptyString(bLines) ? [] : bLines,
    ),
    normalizeDiffOptions(options),
  );

// Given two pairs of arrays of strings:
// Compare the pair of comparison arrays line-by-line.
// Format the corresponding lines in the pair of displayable arrays.
export const diffLinesUnified2 = (
  aLinesDisplay: Array<string>,
  bLinesDisplay: Array<string>,
  aLinesCompare: Array<string>,
  bLinesCompare: Array<string>,
  options?: DiffOptions,
): string => {
  if (isEmptyString(aLinesDisplay) && isEmptyString(aLinesCompare)) {
    aLinesDisplay = [];
    aLinesCompare = [];
  }
  if (isEmptyString(bLinesDisplay) && isEmptyString(bLinesCompare)) {
    bLinesDisplay = [];
    bLinesCompare = [];
  }

  if (
    aLinesDisplay.length !== aLinesCompare.length ||
    bLinesDisplay.length !== bLinesCompare.length
  ) {
    // Fall back to diff of display lines.
    return diffLinesUnified(aLinesDisplay, bLinesDisplay, options);
  }

  const diffs = diffLinesRaw(aLinesCompare, bLinesCompare);

  // Replace comparison lines with displayable lines.
  let aIndex = 0;
  let bIndex = 0;
  diffs.forEach((diff: Diff) => {
    switch (diff[0]) {
      case DIFF_DELETE:
        diff[1] = aLinesDisplay[aIndex];
        aIndex += 1;
        break;

      case DIFF_INSERT:
        diff[1] = bLinesDisplay[bIndex];
        bIndex += 1;
        break;

      default:
        diff[1] = bLinesDisplay[bIndex];
        aIndex += 1;
        bIndex += 1;
    }
  });

  return printDiffLines(diffs, normalizeDiffOptions(options));
};

// Compare two arrays of strings line-by-line.
export const diffLinesRaw = (
  aLines: Array<string>,
  bLines: Array<string>,
): Array<Diff> => {
  const aLength = aLines.length;
  const bLength = bLines.length;

  const isCommon = (aIndex: number, bIndex: number) =>
    aLines[aIndex] === bLines[bIndex];

  const diffs: Array<Diff> = [];
  let aIndex = 0;
  let bIndex = 0;

  const foundSubsequence = (
    nCommon: number,
    aCommon: number,
    bCommon: number,
  ) => {
    for (; aIndex !== aCommon; aIndex += 1) {
      diffs.push(new Diff(DIFF_DELETE, aLines[aIndex]));
    }
    for (; bIndex !== bCommon; bIndex += 1) {
      diffs.push(new Diff(DIFF_INSERT, bLines[bIndex]));
    }
    for (; nCommon !== 0; nCommon -= 1, aIndex += 1, bIndex += 1) {
      diffs.push(new Diff(DIFF_EQUAL, bLines[bIndex]));
    }
  };

  diff(aLength, bLength, isCommon, foundSubsequence);

  // After the last common subsequence, push remaining change items.
  for (; aIndex !== aLength; aIndex += 1) {
    diffs.push(new Diff(DIFF_DELETE, aLines[aIndex]));
  }
  for (; bIndex !== bLength; bIndex += 1) {
    diffs.push(new Diff(DIFF_INSERT, bLines[bIndex]));
  }

  return diffs;
};
