/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import prettyFormat, {plugins as prettyFormatPlugins} from 'pretty-format';
import {createCommonLine, createDeletedLine, createInsertedLine} from '../line';
import {
  CustomDiff,
  CustomFormat,
  DeletedDiffObject,
  DiffObject,
  EqualDiffObject,
  InsertedDiffObject,
  Kind,
  MarkChildrenRecursivelyWithScopedPlugins,
  Path,
} from '../types';

const asymmetricMatcher =
  typeof Symbol === 'function' && Symbol.for
    ? Symbol.for('jest.asymmetricMatcher')
    : 0x1357a5;

const test = (val: unknown): val is AsymmetricMatcher =>
  typeof val === 'object' &&
  val !== null &&
  (val as Record<string, unknown>).$$typeof === asymmetricMatcher;

const serializeAsymmetricMatcher = (val: AsymmetricMatcher) =>
  prettyFormat(val, {plugins: [prettyFormatPlugins.AsymmetricMatcher]});
interface AsymmetricMatcher {
  asymmetricMatch: (a: unknown) => boolean;
  sample: unknown;
  inverse?: boolean;
}

const diff: CustomDiff = (a, b, path, memos, diff, markChildrenRecursively) => {
  const isAMatcher = test(a);
  const matcher = (isAMatcher ? a : b) as AsymmetricMatcher;
  const other = isAMatcher ? b : a;

  const isMatch = matcher.asymmetricMatch(other);
  const matcherName = matcher.toString();

  if (
    matcherName === 'ObjectContaining' ||
    matcherName === 'ObjectNotContaining'
  ) {
    if (isMatch) {
      return diff(other, other, path, memos);
    } else {
      const diffObj = diff(
        isAMatcher ? matcher.sample : a,
        isAMatcher ? b : matcher.sample,
        path,
        memos,
      );
      if (diffObj.kind === Kind.UNEQUAL_TYPE) {
        return {
          ...diffObj,
          a,
          b,
        };
      }
      if (diffObj.kind === Kind.UPDATED) {
        return {
          ...diffObj,
          childDiffs: diffObj.childDiffs?.map(childDiff => {
            switch (childDiff.kind) {
              case Kind.DELETED: {
                if (!isAMatcher) {
                  const equalDiff = {
                    ...childDiff,
                    a: childDiff.val,
                    b: childDiff.val,
                    kind: Kind.EQUAL,
                  } as EqualDiffObject;
                  return equalDiff;
                }
                return childDiff;
              }
              case Kind.INSERTED: {
                if (isAMatcher) {
                  const equalDiff = {
                    ...childDiff,
                    a: childDiff.val,
                    b: childDiff.val,
                    kind: Kind.EQUAL,
                  } as EqualDiffObject;
                  return equalDiff;
                }
                return childDiff;
              }
              case Kind.EQUAL: {
                if (matcher.inverse) {
                  const val = isAMatcher ? childDiff.b : childDiff.a;
                  const kind = isAMatcher ? Kind.INSERTED : Kind.DELETED;
                  return markChildrenRecursively(kind, val, childDiff.path);
                }

                return childDiff;
              }
            }

            return childDiff;
          }),
        };
      }

      throw new Error('Unexpected Error,');
    }
  }

  return isMatch
    ? diff(other, other, path, memos)
    : {
        a,
        aChildDiffs: markChildrenRecursively(Kind.DELETED, a, path).childDiffs,
        b,
        bChildDiffs: markChildrenRecursively(Kind.INSERTED, b, path).childDiffs,
        kind: Kind.UNEQUAL_TYPE,
        path,
      };
};

const format: CustomFormat = (diffObj, context, options, originalFormat) => {
  switch (diffObj.kind) {
    case Kind.EQUAL: {
      const val = test(diffObj.a) ? diffObj.b : diffObj.a;
      return [createCommonLine(options.serialize(val), context)];
    }
    case Kind.UPDATED: {
      if (test(diffObj.a)) {
        diffObj.a = diffObj.a.sample;
      }
      if (test(diffObj.b)) {
        diffObj.b = diffObj.b.sample;
      }

      return originalFormat(diffObj, context, options);
    }
    case Kind.UNEQUAL_TYPE: {
      const insertedDiff: DiffObject = {
        childDiffs: diffObj.bChildDiffs,
        kind: Kind.INSERTED,
        path: diffObj.path,
        val: diffObj.b,
      };
      const deletedDiff: DiffObject = {
        childDiffs: diffObj.aChildDiffs,
        kind: Kind.DELETED,
        path: diffObj.path,
        val: diffObj.a,
      };
      return [
        ...originalFormat(deletedDiff, context, options),
        ...originalFormat(insertedDiff, context, options),
      ];
    }
    case Kind.INSERTED: {
      const name = (diffObj.val as AsymmetricMatcher).toString();
      if (name === 'ObjectContaining' || name === 'ObjectNotContaining') {
        const lines = originalFormat(
          {...diffObj, val: (diffObj.val as AsymmetricMatcher).sample},
          context,
          options,
        );
        lines.shift();

        const firstLine = createInsertedLine('ObjectContaining {', {
          ...context,
          sufix: '',
        });

        return [firstLine, ...lines];
      }
      return [
        createInsertedLine(
          serializeAsymmetricMatcher(diffObj.val as AsymmetricMatcher),
          context,
        ),
      ];
    }
    case Kind.DELETED: {
      return [
        createDeletedLine(
          serializeAsymmetricMatcher(diffObj.val as AsymmetricMatcher),
          context,
        ),
      ];
    }
  }
};

function markChildrenRecursively(
  kind: Kind.DELETED | Kind.INSERTED,
  val: unknown,
  path: Path,
  refs: Set<unknown>,
  markChildrenRecursivelyWithScopedPlugins: MarkChildrenRecursivelyWithScopedPlugins,
): InsertedDiffObject | DeletedDiffObject {
  if (!test(val)) throw new Error('value must be an asymmetric matcher');

  if (
    val.toString() === 'ObjectContaining' ||
    val.toString() === 'ObjectNotContaining'
  ) {
    return {
      ...markChildrenRecursivelyWithScopedPlugins(kind, val.sample, path, refs),
      val,
    };
  }

  return {
    kind,
    path,
    val,
  };
}

export default {
  diff,
  format,
  markChildrenRecursively,
  test,
};
