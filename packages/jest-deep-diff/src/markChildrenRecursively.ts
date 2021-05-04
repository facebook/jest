/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {traverseArray} from './complex/array';
import {wrapCircularObject} from './complex/circularObjects';
import {traverseObject} from './complex/object';
import {getType, isLeafType} from './getType';
import {splitLines} from './primitives';
import type {
  DeletedDiffObject,
  DiffObject,
  DiffPlugin,
  InsertedDiffObject,
  Kind,
  MarkChildrenRecursivelyWithScopedPlugins,
  Path,
} from './types';

function traverse(a: unknown, f: (val: unknown, key: unknown) => DiffObject) {
  const type = getType(a);

  switch (type) {
    case 'array': {
      return traverseArray(a as Array<unknown>, f);
    }
    case 'object': {
      return traverseObject(a, f);
    }
  }

  throw new Error('oopsie');
}

export function markChildrenRecursively<T = unknown>(
  kind: Kind.INSERTED | Kind.DELETED,
  val: T,
  path: Path,
  refs = new Set(),
  plugins: Array<DiffPlugin>,
): InsertedDiffObject | DeletedDiffObject {
  const markChildrenRecursivelyWithScopedPlugins: MarkChildrenRecursivelyWithScopedPlugins = (
    kind,
    val,
    path,
    refs,
  ) => markChildrenRecursively(kind, val, path, refs, plugins);

  for (const plugin of plugins) {
    if (plugin.test(val)) {
      return plugin.markChildrenRecursively(
        kind,
        val,
        path,
        refs,
        markChildrenRecursivelyWithScopedPlugins,
      );
    }
  }

  if (isLeafType(val)) {
    return {
      kind,
      path,
      val,
    };
  }

  if (typeof val === 'string') {
    const lines = splitLines(val);
    return {
      childDiffs:
        lines.length === 1
          ? undefined
          : lines.map(childVal => ({kind, val: childVal})),
      kind,
      path,
      val,
    };
  }

  if (refs.has(val)) {
    return {
      kind,
      path,
      val: wrapCircularObject(val),
    };
  }

  refs.add(val);

  return {
    childDiffs: traverse(val, (childVal, childKey) =>
      markChildrenRecursivelyWithScopedPlugins(kind, childVal, childKey, refs),
    ),
    kind,
    path,
    val,
  };
}
