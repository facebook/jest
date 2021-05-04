/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {createCommonLine, createDeletedLine, createInsertedLine} from '../line';
import {emptyValue} from '../primitives';
import {
  Context,
  DiffFunction,
  DiffObject,
  Format,
  FormatComplexDiff,
  Kind,
  Line,
  LineGenerationOptions,
  Path,
} from '../types';
import {getConstructorName} from './utils';

export function diffArrays(
  a: Array<unknown>,
  b: Array<unknown>,
  path: Path,
  diff: DiffFunction<unknown, unknown>,
): DiffObject<Array<unknown>> {
  let kind = Kind.EQUAL;
  const childDiffs = [];
  let aIndex = a.length - 1;
  let bIndex = b.length - 1;
  while (aIndex > bIndex) {
    kind = Kind.UPDATED;
    childDiffs.push(diff(a[aIndex], emptyValue, aIndex));
    aIndex--;
  }
  while (bIndex > aIndex) {
    kind = Kind.UPDATED;
    childDiffs.push(diff(emptyValue, b[bIndex], bIndex));
    bIndex--;
  }
  while (aIndex >= 0) {
    const propDiff = diff(a[aIndex], b[aIndex], aIndex);
    childDiffs.push(propDiff);
    if (kind === Kind.EQUAL && propDiff.kind !== Kind.EQUAL) {
      kind = Kind.UPDATED;
    }
    aIndex--;
  }

  return {
    a,
    b,
    childDiffs: childDiffs.reverse(),
    kind,
    path,
  };
}

export function traverseArray(
  val: Array<unknown>,
  f: (val: unknown, key: number) => DiffObject,
): Array<DiffObject> {
  return val.map(f);
}

function formatArrayProperties(
  childDiffs: Array<DiffObject>,
  context: Readonly<Context>,
  opts: LineGenerationOptions,
  format: Format,
) {
  const nextContext = {
    indent: context.indent + '  ',
    sufix: ',',
  };

  let lines: Array<Line> = [];
  for (const childDiff of childDiffs) {
    lines = lines.concat(...format(childDiff, nextContext, opts));
  }
  return lines;
}

export const formatArrayDiff: FormatComplexDiff<Array<unknown>> = (
  diff,
  context,
  opts,
  format,
) => {
  const formattedChildDiffs = diff.childDiffs
    ? formatArrayProperties(diff.childDiffs, context, opts, format)
    : [];

  if (diff.kind === Kind.INSERTED) {
    if (formattedChildDiffs.length > 0) {
      const firstLine = createInsertedLine(
        getConstructorName(diff.val) + ' [',
        {
          ...context,
          sufix: '',
        },
      );
      const lastLine = createInsertedLine(']', {
        ...context,
        prefix: '',
      });

      return [firstLine, ...formattedChildDiffs, lastLine];
    } else {
      const constructorLine = createInsertedLine(
        getConstructorName(diff.val) + ' [ ]',
        {
          ...context,
          sufix: '',
        },
      );
      return [constructorLine];
    }
  }

  if (diff.kind === Kind.DELETED) {
    if (formattedChildDiffs.length > 0) {
      const firstLine = createDeletedLine(getConstructorName(diff.val) + ' [', {
        ...context,
        sufix: '',
      });
      const lastLine = createDeletedLine(']', {
        ...context,
        prefix: '',
      });

      return [firstLine, ...formattedChildDiffs, lastLine];
    } else {
      const constructorLine = createDeletedLine(
        getConstructorName(diff.val) + ' [ ]',
        {
          ...context,
          sufix: '',
        },
      );
      return [constructorLine];
    }
  }

  if (formattedChildDiffs.length > 0) {
    const firstLine = createCommonLine(getConstructorName(diff.a) + ' [', {
      ...context,
      sufix: '',
    });
    const lastLine = createCommonLine(']', {
      ...context,
      prefix: '',
    });

    return [firstLine, ...formattedChildDiffs, lastLine];
  } else {
    const constructorLine = createCommonLine(
      getConstructorName(diff.a) + ' [ ]',
      {
        ...context,
        sufix: '',
      },
    );
    return [constructorLine];
  }
};
