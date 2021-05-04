/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import diffSequence from 'diff-sequences';
import prettyFormat from 'pretty-format';
import {
  createDeleted,
  createEqual,
  createInserted,
  createUpdated,
  getComplexValueDiffKind,
} from './diffObject';
import {
  createCommonLine,
  createDeletedLine,
  createInsertedLine,
  formatUpdated,
} from './line';
import {
  DiffObject,
  FormatComplexDiff,
  FormatPrimitives,
  Kind,
  Path,
} from './types';

type DiffPrimitive<T1 = unknown, T2 = T1> = (
  a: T1,
  b: T2,
  path: Path,
) => DiffObject<T1, T2>;

export const emptyValue = Symbol('@jest-deep-diff/emptyValue');

const compareErrors = (a: Error, b: Error) => a.message == b.message;

export const diffErrors: DiffPrimitive<Error, Error> = (a, b, path) => {
  if (compareErrors(a, b)) return createEqual(a, b, path);
  return createUpdated(a, b, path);
};

// eslint-disable-next-line @typescript-eslint/ban-types
const compareFunctions = (a: Function, b: Function) => Object.is(a, b);

// eslint-disable-next-line @typescript-eslint/ban-types
export const diffFunctions: DiffPrimitive<Function, Function> = (a, b, path) =>
  compareFunctions(a, b) ? createEqual(a, b, path) : createUpdated(a, b, path);

const compareRegExps = (a: RegExp, b: RegExp) =>
  Object.is(a.source, b.source) && Object.is(a.flags, b.flags);

export const diffRegExps: DiffPrimitive<RegExp, RegExp> = (a, b, path) =>
  compareRegExps(a, b) ? createEqual(a, b, path) : createUpdated(a, b, path);

const compareDates = (a: Date, b: Date) => +a == +b;

export const diffDates: DiffPrimitive<Date, Date> = (a, b, path) =>
  compareDates(a, b) ? createEqual(a, b, path) : createUpdated(a, b, path);

const compareBooleans = (a: boolean, b: boolean) => Object.is(a, b);

export const diffBooleans: DiffPrimitive<boolean, boolean> = (a, b, path) =>
  compareBooleans(a, b) ? createEqual(a, b, path) : createUpdated(a, b, path);

const compareNumbers = (a: number, b: number) => Object.is(a, b);

export const diffNumbers: DiffPrimitive<number, number> = (a, b, path) =>
  compareNumbers(a, b) ? createEqual(a, b, path) : createUpdated(a, b, path);

export const formatPrimitiveDiff: FormatPrimitives = (diff, context, opts) => {
  if (diff.kind === Kind.EQUAL) {
    return [createCommonLine(opts.serialize(diff.a), context)];
  }
  return formatUpdated(opts.serialize(diff.a), opts.serialize(diff.b), context);
};

export const splitLines = (string: string): Array<string> => string.split('\n');

// adapted from jest-diff
const diffLinesRaw = (
  aLines: Array<string>,
  bLines: Array<string>,
): Array<DiffObject> => {
  const aLength = aLines.length;
  const bLength = bLines.length;

  const isCommon = (aIndex: number, bIndex: number) =>
    aLines[aIndex] === bLines[bIndex];

  const diffs: Array<DiffObject> = [];
  let aIndex = 0;
  let bIndex = 0;

  const foundSubsequence = (
    nCommon: number,
    aCommon: number,
    bCommon: number,
  ) => {
    for (; aIndex !== aCommon; aIndex += 1) {
      diffs.push(createDeleted(aLines[aIndex], undefined));
    }
    for (; bIndex !== bCommon; bIndex += 1) {
      diffs.push(createInserted(bLines[bIndex], undefined));
    }
    for (; nCommon !== 0; nCommon -= 1, aIndex += 1, bIndex += 1) {
      diffs.push(createEqual(bLines[bIndex], bLines[bIndex], undefined));
    }
  };

  diffSequence(aLength, bLength, isCommon, foundSubsequence);

  // After the last common subsequence, push remaining change items.
  for (; aIndex !== aLength; aIndex += 1) {
    diffs.push(createDeleted(aLines[aIndex], undefined));
  }
  for (; bIndex !== bLength; bIndex += 1) {
    diffs.push(createInserted(bLines[bIndex], undefined));
  }

  return diffs;
};

export const diffStrings: DiffPrimitive<string, string> = (a, b, path) => {
  const aLines = splitLines(a);
  const bLines = splitLines(b);

  if (aLines.length === 1 && bLines.length === 1) {
    if (Object.is(a, b)) {
      return createEqual(a, b, path);
    }
    return createUpdated(a, b, path);
  }

  const childDiffs = diffLinesRaw(aLines, bLines);

  return {
    a,
    b,
    childDiffs,
    kind: getComplexValueDiffKind(childDiffs),
    path,
  };
};

const stringQuote = '"';

const noop = (id: string) => id;

export const formatStringDiff: FormatComplexDiff<string, string> = (
  diff,
  context,
) => {
  if (!diff.childDiffs) {
    const serializer = typeof diff.path === 'undefined' ? noop : prettyFormat;

    if (diff.kind === Kind.EQUAL) {
      return [createCommonLine(serializer(diff.a as string), context)];
    }

    if (diff.kind === Kind.INSERTED) {
      return [createInsertedLine(serializer(diff.val), context)];
    }

    if (diff.kind === Kind.DELETED) {
      return [createDeletedLine(serializer(diff.val), context)];
    }

    return formatUpdated(
      serializer(diff.a) as string,
      serializer(diff.b) as string,
      context,
    );
  }

  return diff.childDiffs.map((childDiff, i, arr) => {
    const updatedContext = {...context, prefix: '', sufix: ''};
    if (typeof diff.path !== 'undefined') {
      if (i === 0) {
        const previousPrefix = context.prefix || '';
        updatedContext.prefix = previousPrefix + stringQuote;
      }

      if (i === arr.length - 1) {
        const previousSuffix = context.sufix || '';
        updatedContext.sufix = stringQuote + previousSuffix;
      }
    }

    if (childDiff.kind === Kind.INSERTED) {
      return createInsertedLine(childDiff.val as string, updatedContext);
    }

    if (childDiff.kind === Kind.DELETED) {
      return createDeletedLine(childDiff.val as string, updatedContext);
    }

    if (childDiff.kind === Kind.EQUAL) {
      return createCommonLine(childDiff.a as string, updatedContext);
    }

    throw new Error(`Unknown diff result ${childDiff.kind}`);
  });
};
