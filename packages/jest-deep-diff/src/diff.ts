/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {diffArrays} from './complex/array';
import {wrapIfHasCircularity} from './complex/circularObjects';
import {diffMaps} from './complex/map';
import {diffObjects} from './complex/object';
import {createEqual, createUpdated} from './diffObject';
import {getType, isLeafType} from './getType';
import {markChildrenRecursively as defaultMarkChildrenRecursively} from './markChildrenRecursively';
import {
  diffBooleans,
  diffDates,
  diffErrors,
  diffFunctions,
  diffNumbers,
  diffRegExps,
  diffStrings,
  emptyValue,
} from './primitives';
import {DiffObject, DiffPlugin, Kind, Memos, Path} from './types';

// eslint-disable-next-line @typescript-eslint/ban-types
type PrimitiveWrapper = String | Number | Boolean;

function diff(
  a: unknown,
  b: unknown,
  path?: Path,
  memos?: Memos,
  plugins: Array<DiffPlugin> = [],
): DiffObject {
  const markChildrenRecursively = <T>(
    kind: Kind.INSERTED | Kind.DELETED,
    val: T,
    path: Path,
  ) => defaultMarkChildrenRecursively(kind, val, path, new Set(), plugins);

  if (a === emptyValue) {
    return markChildrenRecursively(Kind.INSERTED, b, path);
  }
  if (b === emptyValue) {
    return markChildrenRecursively(Kind.DELETED, a, path);
  }

  const diffWithPlugins = (
    a: unknown,
    b: unknown,
    path?: Path,
    memos?: Memos,
  ) => diff(a, b, path, memos, plugins);

  for (const customDiff of plugins) {
    if (customDiff.test(a) || customDiff.test(b)) {
      return customDiff.diff(
        a,
        b,
        path,
        memos,
        diffWithPlugins,
        markChildrenRecursively,
      );
    }
  }

  const aType = getType(a);
  const bType = getType(b);

  if (aType !== bType) {
    return {
      a,
      aChildDiffs: markChildrenRecursively(Kind.DELETED, a, path).childDiffs,
      b,
      bChildDiffs: markChildrenRecursively(Kind.INSERTED, b, path).childDiffs,
      kind: Kind.UNEQUAL_TYPE,
      path,
    };
  }

  if (isLeafType(a)) {
    if (Object.is(a, b)) return createEqual(a, b, path);

    switch (aType) {
      case 'number':
        return diffNumbers(a as number, b as number, path);
      case 'boolean':
        return diffBooleans(a as boolean, b as boolean, path);
      case 'date':
        return diffDates(a as Date, b as Date, path);
      case 'regexp':
        return diffRegExps(a as RegExp, b as RegExp, path);
      case 'function':
        // eslint-disable-next-line @typescript-eslint/ban-types
        return diffFunctions(a as Function, b as Function, path);
      case 'error':
        return diffErrors(a as Error, b as Error, path);
      case 'Number':
      case 'String':
      case 'Boolean':
        return Object.is(
          (a as PrimitiveWrapper).valueOf(),
          (b as PrimitiveWrapper).valueOf(),
        )
          ? createEqual(a, b, path)
          : createUpdated(a, b, path);
    }
  }

  if (aType === 'string') {
    return diffStrings(a as string, b as string, path);
  }

  // Here we already know that a and b are both complex structures
  if (!Object.is(Object.getPrototypeOf(a), Object.getPrototypeOf(b))) {
    return {
      a,
      aChildDiffs: markChildrenRecursively(Kind.DELETED, a, path).childDiffs,
      b,
      bChildDiffs: markChildrenRecursively(Kind.INSERTED, b, path).childDiffs,
      kind: Kind.UNEQUAL_TYPE,
      path,
    };
  }

  // adapted from node assert
  // Use memos to handle cycles.
  if (memos === undefined) {
    memos = {
      a: new Map(),
      b: new Map(),
      position: 0,
    };
  } else {
    // We prevent up to two map.has(x) calls by directly retrieving the value
    // and checking for undefined. The map can only contain numbers, so it is
    // safe to check for undefined only.
    const bMemoA = memos.a.get(a);
    const bMemoB = memos.b.get(b);
    if (bMemoA !== undefined || bMemoB !== undefined) {
      return bMemoA === bMemoB
        ? createEqual(
            wrapIfHasCircularity(a, bMemoA),
            wrapIfHasCircularity(b, bMemoB),
            path,
          )
        : createUpdated(
            wrapIfHasCircularity(a, bMemoA),
            wrapIfHasCircularity(b, bMemoB),
            path,
          );
    }
    memos.position++;
  }

  memos.a.set(a, memos.position);
  memos.b.set(b, memos.position);

  const diffWithMemosAndCustomDiffs = (a: unknown, b: unknown, path: Path) =>
    diffWithPlugins(a, b, path, memos);

  switch (aType) {
    case 'array':
      return diffArrays(
        a as Array<unknown>,
        b as Array<unknown>,
        path,
        diffWithMemosAndCustomDiffs,
      );
    case 'object':
      return diffObjects(
        a as Record<string | number | symbol, unknown>,
        b as Record<string | number | symbol, unknown>,
        path,
        diffWithMemosAndCustomDiffs,
      );
    case 'map':
      return diffMaps(
        a as Map<unknown, unknown>,
        b as Map<unknown, unknown>,
        path,
        diffWithMemosAndCustomDiffs,
      );
    default:
      throw new Error('oopsie ' + aType);
  }
}

export default diff;
