/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// options
export type DeepDiffOptions = Omit<FormatOptions, 'plugins'> & {
  plugins?: Array<Plugin>;
};

export type FormatOptions = Partial<FormatOptionsNormalized>;

export type DiffOptionsColor = (arg: string) => string; // subset of Chalk type

export type FormatOptionsNormalized = {
  aAnnotation: string;
  aColor: DiffOptionsColor;
  aIndicator: string;
  bAnnotation: string;
  bColor: DiffOptionsColor;
  bIndicator: string;
  changeColor: DiffOptionsColor;
  changeLineTrailingSpaceColor: DiffOptionsColor;
  commonColor: DiffOptionsColor;
  commonIndicator: string;
  commonLineTrailingSpaceColor: DiffOptionsColor;
  contextLines: number;
  emptyFirstOrLastLinePlaceholder: string;
  expand: boolean;
  includeChangeCounts: boolean;
  omitAnnotationLines: boolean;
  patchColor: DiffOptionsColor;
  serialize: (val: unknown) => string;
  plugins: Array<FormatPlugin>;
};

export type MarkChildrenRecursivelyWithScopedPlugins = (
  kind: Kind.INSERTED | Kind.DELETED,
  val: unknown,
  path: Path,
  memo?: Set<unknown>,
) => InsertedDiffObject | DeletedDiffObject;

// plugins
export type PluginTest = (a: unknown) => boolean;
export interface Plugin {
  test: PluginTest;
  diff: CustomDiff;
  format: CustomFormat;
  markChildrenRecursively: CustomMarkChildrenRecursively;
}

export type DiffPlugin = Pick<
  Plugin,
  'test' | 'diff' | 'markChildrenRecursively'
>;
export type FormatPlugin = Pick<Plugin, 'test' | 'format'>;

// DiffObject
export type Path = unknown;

export enum Kind {
  EQUAL = 'EQUAL',
  UPDATED = 'UPDATED',
  INSERTED = 'INSERTED',
  DELETED = 'DELETED',
  UNEQUAL_TYPE = 'UNEQUAL_TYPE',
}

export type InsertedDiffObject<T = unknown> = {
  kind: Kind.INSERTED;
  path?: Path;
  val: T;
  childDiffs?: Array<DiffObject>;
};
export type DeletedDiffObject<T = unknown> = {
  kind: Kind.DELETED;
  path?: Path;
  val: T;
  childDiffs?: Array<DiffObject>;
};

export type EqualDiffObject<T1 = unknown, T2 = unknown> = {
  kind: Kind.EQUAL;
  path?: Path;
  a: T1;
  b: T2;
  childDiffs?: Array<DiffObject>;
};

export type UpdatedDiffObject<T1 = unknown, T2 = unknown> = Omit<
  EqualDiffObject<T1, T2>,
  'kind'
> & {kind: Kind.UPDATED};

export type UnequalTypeDiffObject<T1 = unknown, T2 = unknown> = {
  kind: Kind.UNEQUAL_TYPE;
  path?: Path;
  a: T1;
  b: T2;
  aChildDiffs?: Array<DiffObject>;
  bChildDiffs?: Array<DiffObject>;
};

export type DiffObject<T1 = unknown, T2 = T1> =
  | EqualDiffObject<T1, T2>
  | UpdatedDiffObject<T1, T2>
  | UnequalTypeDiffObject<T1, T2>
  | InsertedDiffObject<T2>
  | DeletedDiffObject<T1>;

export type FormatPrimitiveDiffObject<T1 = unknown, T2 = T1> =
  | EqualDiffObject<T1, T2>
  | UpdatedDiffObject<T1, T2>;

export type FormatComplexDiffObject<T1 = unknown, T2 = T1> =
  | EqualDiffObject<T1, T2>
  | UpdatedDiffObject<T1, T2>
  | InsertedDiffObject<T2>
  | DeletedDiffObject<T1>;

export type Memos = {
  a: Map<unknown, number>;
  b: Map<unknown, number>;
  position: number;
};

export type DiffFunction<T1 = unknown, T2 = T1> = (
  a: T1,
  b: T2,
  path: Path | undefined,
  memos?: Memos,
) => DiffObject<T1, T2>;

export type CustomDiff = (
  a: unknown,
  b: unknown,
  path: Path | undefined,
  memos: Memos | undefined,
  diff: DiffFunction,
  markChildrenRecursively: MarkChildrenRecursivelyWithScopedPlugins,
) => DiffObject;

export type CustomMarkChildrenRecursively = (
  kind: Kind.INSERTED | Kind.DELETED,
  val: unknown,
  path: Path,
  ref: Set<unknown>,
  markChildrenRecursively: CustomMarkChildrenRecursively,
) => InsertedDiffObject | DeletedDiffObject;

// format

export type LineGenerationOptions = {
  plugins: Array<FormatPlugin>;
  serialize: (val: unknown) => string;
};

export type Format<T1 = unknown, T2 = T1> = (
  diff: DiffObject<T1, T2>,
  context: Context,
  options: LineGenerationOptions,
) => Array<Line>;

export type FormatPrimitives<T1 = unknown, T2 = T1> = (
  diff: FormatPrimitiveDiffObject<T1, T2>,
  context: Context,
  options: LineGenerationOptions,
) => Array<Line>;

export type FormatComplexDiff<T1 = unknown, T2 = T1> = (
  diff: FormatComplexDiffObject<T1, T2>,
  context: Context,
  options: LineGenerationOptions,
  format: Format,
) => Array<Line>;

export type CustomFormat<T1 = unknown, T2 = T1> = (
  diff: DiffObject<T1, T2>,
  context: Context,
  options: LineGenerationOptions,
  format: Format,
) => Array<Line>;

export enum LineType {
  COMMON,
  INSERTED,
  DELETED,
}

export interface Context {
  indent?: string;
  prefix?: string;
  sufix?: string;
}

export interface Line {
  type: LineType;
  prefix: string;
  val: string;
  suffix: string;
  indent: string;
}
