/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  DeletedDiffObject,
  DiffObject,
  EqualDiffObject,
  InsertedDiffObject,
  Kind,
  Path,
  UpdatedDiffObject,
} from './types';

export function createDiffObject<T1, T2>(
  kind: Kind.EQUAL | Kind.UPDATED,
  a: T1,
  b: T2,
  path: Path,
): EqualDiffObject<T1, T2> | UpdatedDiffObject<T1, T2> {
  return {
    a,
    b,
    kind,
    ...(typeof path !== 'undefined' && {path}),
  };
}

type CreateDiffObjectWithFixedKind = <T1, T2>(
  a: T1,
  b: T2,
  path: Path,
) => DiffObject<T1, T2>;

export const createEqual: CreateDiffObjectWithFixedKind = (a, b, path) =>
  createDiffObject(Kind.EQUAL, a, b, path);

export const createUpdated: CreateDiffObjectWithFixedKind = (a, b, path) =>
  createDiffObject(Kind.UPDATED, a, b, path);

export const createDeleted = <T>(val: T, path: Path): DeletedDiffObject<T> => ({
  kind: Kind.DELETED,
  ...(typeof path !== 'undefined' && {path}),
  val,
});

export const createInserted = <T>(
  val: T,
  path: Path,
): InsertedDiffObject<T> => ({
  kind: Kind.INSERTED,
  ...(typeof path !== 'undefined' && {path}),
  val,
});

export function getComplexValueDiffKind(
  childrenDiffs: Array<DiffObject<unknown, unknown>>,
): Kind.EQUAL | Kind.UPDATED {
  for (const diff of childrenDiffs) {
    if (diff.kind !== Kind.EQUAL) {
      return Kind.UPDATED;
    }
  }

  return Kind.EQUAL;
}
