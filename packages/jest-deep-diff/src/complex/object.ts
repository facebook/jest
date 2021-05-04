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

/** https://github.com/microsoft/TypeScript/issues/1863 */
export type Key = any;

export function getKeys(o: Record<Key, unknown>): Array<Key> {
  const keys: Array<string | symbol> = Object.keys(o);
  return keys.concat(
    Object.getOwnPropertySymbols(o).filter(
      symbol => Object.getOwnPropertyDescriptor(o, symbol)!.enumerable,
    ),
  );
}

export function diffObjects(
  a: Record<Key, unknown>,
  b: Record<Key, unknown>,
  path: Path,
  diffFunc: DiffFunction,
): DiffObject<Record<Key, unknown>> {
  const childDiffs = [];
  const aKeys: Array<Key | null> = getKeys(a);
  const bKeys: Array<Key | null> = getKeys(b);
  for (let i = 0; i < aKeys.length; i++) {
    const key = aKeys[i] as Key;
    /* NOTE: could use something more efficient if
    the object has many keys */
    const otherIndex = bKeys.indexOf(key);
    if (otherIndex >= 0) {
      childDiffs.push(diffFunc(a[key], b[key], key));
      bKeys[otherIndex] = null;
    } else {
      childDiffs.push(diffFunc(a[key], emptyValue, key));
    }
  }
  for (let i = 0; i <= bKeys.length; i++) {
    const key = bKeys[i];
    if (typeof key !== 'undefined' && key !== null) {
      childDiffs.push(diffFunc(emptyValue, b[key], key));
    }
  }

  return {
    a,
    b,
    childDiffs,
    kind: getComplexValueDiffKind(childDiffs),
    path,
  };
}

export function traverseObject(
  a: unknown,
  f: (val: unknown, key: unknown) => DiffObject,
): Array<DiffObject> {
  return getKeys(a as Record<Key, unknown>).map(key =>
    f((a as Record<Key, unknown>)[key], key),
  );
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
    nextContext.prefix = `"${childDiff.path}": `;
    lines = lines.concat(...format(childDiff, nextContext, opts));
  }
  return lines;
}

export const formatObjectDiff: FormatComplexDiff<Record<Key, unknown>> = (
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
