/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {getComplexValueDiffKind} from '../diffObject';
import {createCommonLine, createDeletedLine, createInsertedLine} from '../line';
import {emptyValue} from '../primitives';
import {
  Context,
  DiffObject,
  Format,
  FormatComplexDiff,
  Kind,
  Line,
  LineGenerationOptions,
  Path,
} from '../types';
import {getConstructorName} from './utils';

// Maps Diff and Format are not fully implemented yet
export function diffMaps(
  a: Map<unknown, unknown>,
  b: Map<unknown, unknown>,
  path: Path,
  diffFunc: (a: unknown, b: unknown, path?: any) => DiffObject,
): DiffObject {
  const childDiffs = [];

  const seen = new Set();
  for (const aEntry of a.entries()) {
    if (b.has(aEntry[0])) {
      const childDiff = diffFunc(aEntry[1], b.get(aEntry[0]), aEntry[0]);
      seen.add(aEntry[0]);
      childDiffs.push(childDiff);
    } else {
      childDiffs.push(diffFunc(aEntry[1], emptyValue, aEntry[0]));
    }
  }

  for (const bEntry of b.entries()) {
    if (!seen.has(bEntry[0])) {
      childDiffs.push(diffFunc(emptyValue, bEntry[1], bEntry[0]));
    }
  }

  const diff: DiffObject = {
    a,
    b,
    childDiffs,
    kind: getComplexValueDiffKind(childDiffs),
    path,
  };

  return diff;
}

function formatObjectProperties(
  childDiffs: Array<DiffObject<unknown, unknown>>,
  context: Readonly<Context>,
  opts: LineGenerationOptions,
  format: Format,
): Array<Line> {
  const nextContext: Context = {
    indent: context.indent + '  ',
    sufix: ',',
  };

  let lines: Array<Line> = [];
  for (const childDiff of childDiffs) {
    nextContext.prefix = `"${childDiff.path}" => `;
    lines = lines.concat(...format(childDiff, nextContext, opts));
  }
  return lines;
}

export const formatMapDiff: FormatComplexDiff<Map<unknown, unknown>> = (
  diff,
  context,
  opts,
  format,
) => {
  const formattedChildDiffs = diff.childDiffs
    ? formatObjectProperties(diff.childDiffs, context, opts, format)
    : [];

  if (diff.kind === Kind.INSERTED) {
    if (formattedChildDiffs.length > 0) {
      const firstLine = createInsertedLine(
        getConstructorName(diff.val) + ' {',
        {
          ...context,
          sufix: '',
        },
      );
      const lastLine = createInsertedLine('}', {
        ...context,
        prefix: '',
      });

      return [firstLine, ...formattedChildDiffs, lastLine];
    } else {
      const constructorLine = createInsertedLine(
        getConstructorName(diff.val) + ' { }',
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
      const firstLine = createDeletedLine(getConstructorName(diff.val) + ' {', {
        ...context,
        sufix: '',
      });
      const lastLine = createDeletedLine('}', {
        ...context,
        prefix: '',
      });

      return [firstLine, ...formattedChildDiffs, lastLine];
    } else {
      const constructorLine = createDeletedLine(
        getConstructorName(diff.val) + ' { }',
        {
          ...context,
          sufix: '',
        },
      );
      return [constructorLine];
    }
  }

  if (formattedChildDiffs.length > 0) {
    const firstLine = createCommonLine(getConstructorName(diff.a) + ' {', {
      ...context,
      sufix: '',
    });
    const lastLine = createCommonLine('}', {
      ...context,
      prefix: '',
    });

    return [firstLine, ...formattedChildDiffs, lastLine];
  } else {
    const constructorLine = createCommonLine(
      getConstructorName(diff.a) + ' { }',
      {
        ...context,
        sufix: '',
      },
    );
    return [constructorLine];
  }
};
