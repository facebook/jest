/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {createCommonLine, createDeletedLine, createInsertedLine} from '../line';
import {Format, Kind} from '../types';

export const circularVal = Symbol('circularVal');

export interface WrappedCircularObject {
  [circularVal]: unknown;
  circularToDepth?: number;
}

export function wrapCircularObject(
  obj: unknown,
  circularToDepth?: number,
): WrappedCircularObject {
  return {
    circularToDepth,
    [circularVal]: obj,
  };
}

export function wrapIfHasCircularity<T>(
  obj: T,
  circularToDepth?: number,
): T | WrappedCircularObject {
  if (typeof circularToDepth === 'number') {
    return wrapCircularObject(obj, circularToDepth);
  }
  return obj;
}

export function isWrappedCircular(obj: unknown): obj is WrappedCircularObject {
  return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, circularVal);
}

const serialize = (circular: WrappedCircularObject): string =>
  typeof circular.circularToDepth === 'number'
    ? `[Circular to depth ${circular.circularToDepth}]`
    : `[Circular]`;

export const formatCircularDiff: Format = (diff, context, opts) => {
  if (diff.kind === Kind.EQUAL) {
    return [createCommonLine(opts.serialize(diff.a), context)];
  }
  if (diff.kind === Kind.INSERTED) {
    return [createInsertedLine(opts.serialize(diff.val), context)];
  }
  if (diff.kind === Kind.DELETED) {
    return [createDeletedLine(opts.serialize(diff.val), context)];
  }
  if (diff.kind === Kind.UPDATED) {
    return [
      createDeletedLine(opts.serialize(diff.a), context),
      createInsertedLine(opts.serialize(diff.b), context),
    ];
  }

  throw new Error('CircularDiff can only be EQUAL or UPDATED');
};

export const wrappedCircularSerializer = {
  serialize,
  test: isWrappedCircular,
};
