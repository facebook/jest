/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {isPrimitive} from 'jest-get-type';
import {
  equals,
  isA,
  isImmutableUnorderedKeyed,
  isImmutableUnorderedSet,
} from './jasmineUtils';

type GetPath = {
  hasEndProp?: boolean;
  lastTraversedObject: unknown;
  traversedPath: Array<string>;
  value?: unknown;
};

// Return whether object instance inherits getter from its class.
const hasGetterFromConstructor = (object: object, key: string) => {
  const constructor = object.constructor;
  if (constructor === Object) {
    // A literal object has Object as constructor.
    // Therefore, it cannot inherit application-specific getters.
    // Furthermore, Object has __proto__ getter which is not relevant.
    // Array, Boolean, Number, String constructors don’t have any getters.
    return false;
  }
  if (typeof constructor !== 'function') {
    // Object.create(null) constructs object with no constructor nor prototype.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create#Custom_and_Null_objects
    return false;
  }

  const descriptor = Object.getOwnPropertyDescriptor(
    constructor.prototype,
    key,
  );
  return descriptor !== undefined && typeof descriptor.get === 'function';
};

export const hasOwnProperty = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key) ||
  hasGetterFromConstructor(object, key);

export const getPath = (
  object: Record<string, any>,
  propertyPath: string | Array<string>,
): GetPath => {
  if (!Array.isArray(propertyPath)) {
    propertyPath = (propertyPath as string).split('.');
  }

  if (propertyPath.length) {
    const lastProp = propertyPath.length === 1;
    const prop = propertyPath[0];
    const newObject = object[prop];

    if (!lastProp && (newObject === null || newObject === undefined)) {
      // This is not the last prop in the chain. If we keep recursing it will
      // hit a `can't access property X of undefined | null`. At this point we
      // know that the chain has broken and we can return right away.
      return {
        hasEndProp: false,
        lastTraversedObject: object,
        traversedPath: [],
      };
    }

    const result = getPath(newObject, propertyPath.slice(1));

    if (result.lastTraversedObject === null) {
      result.lastTraversedObject = object;
    }

    result.traversedPath.unshift(prop);

    if (lastProp) {
      // Does object have the property with an undefined value?
      // Although primitive values support bracket notation (above)
      // they would throw TypeError for in operator (below).
      result.hasEndProp =
        newObject !== undefined || (!isPrimitive(object) && prop in object);

      if (!result.hasEndProp) {
        result.traversedPath.shift();
      }
    }

    return result;
  }

  return {
    lastTraversedObject: null,
    traversedPath: [],
    value: object,
  };
};

// Strip properties from object that are not present in the subset. Useful for
// printing the diff for toMatchObject() without adding unrelated noise.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getObjectSubset = (
  object: any,
  subset: any,
  seenReferences: WeakMap<object, boolean> = new WeakMap(),
): any => {
  if (Array.isArray(object)) {
    if (Array.isArray(subset) && subset.length === object.length) {
      // The map method returns correct subclass of subset.
      return subset.map((sub: any, i: number) =>
        getObjectSubset(object[i], sub),
      );
    }
  } else if (object instanceof Date) {
    return object;
  } else if (isObject(object) && isObject(subset)) {
    if (equals(object, subset, [iterableEquality, subsetEquality])) {
      // Avoid unnecessary copy which might return Object instead of subclass.
      return subset;
    }

    const trimmed: any = {};
    seenReferences.set(object, trimmed);

    Object.keys(object)
      .filter(key => hasOwnProperty(subset, key))
      .forEach(key => {
        trimmed[key] = seenReferences.has(object[key])
          ? seenReferences.get(object[key])
          : getObjectSubset(object[key], subset[key], seenReferences);
      });

    if (Object.keys(trimmed).length > 0) {
      return trimmed;
    }
  }
  return object;
};

const IteratorSymbol = Symbol.iterator;

const hasIterator = (object: any) =>
  !!(object != null && object[IteratorSymbol]);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const iterableEquality = (
  a: any,
  b: any,
  aStack: Array<any> = [],
  bStack: Array<any> = [],
): boolean | undefined => {
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Array.isArray(a) ||
    Array.isArray(b) ||
    !hasIterator(a) ||
    !hasIterator(b)
  ) {
    return undefined;
  }
  if (a.constructor !== b.constructor) {
    return false;
  }
  let length = aStack.length;
  while (length--) {
    // Linear search. Performance is inversely proportional to the number of
    // unique nested structures.
    // circular references at same depth are equal
    // circular reference is not equal to non-circular one
    if (aStack[length] === a) {
      return bStack[length] === b;
    }
  }
  aStack.push(a);
  bStack.push(b);

  const iterableEqualityWithStack = (a: any, b: any) =>
    iterableEquality(a, b, [...aStack], [...bStack]);

  if (a.size !== undefined) {
    if (a.size !== b.size) {
      return false;
    } else if (isA('Set', a) || isImmutableUnorderedSet(a)) {
      let allFound = true;
      for (const aValue of a) {
        if (!b.has(aValue)) {
          let has = false;
          for (const bValue of b) {
            const isEqual = equals(aValue, bValue, [iterableEqualityWithStack]);
            if (isEqual === true) {
              has = true;
            }
          }

          if (has === false) {
            allFound = false;
            break;
          }
        }
      }
      // Remove the first value from the stack of traversed values.
      aStack.pop();
      bStack.pop();
      return allFound;
    } else if (isA('Map', a) || isImmutableUnorderedKeyed(a)) {
      let allFound = true;
      for (const aEntry of a) {
        if (
          !b.has(aEntry[0]) ||
          !equals(aEntry[1], b.get(aEntry[0]), [iterableEqualityWithStack])
        ) {
          let has = false;
          for (const bEntry of b) {
            const matchedKey = equals(aEntry[0], bEntry[0], [
              iterableEqualityWithStack,
            ]);

            let matchedValue = false;
            if (matchedKey === true) {
              matchedValue = equals(aEntry[1], bEntry[1], [
                iterableEqualityWithStack,
              ]);
            }
            if (matchedValue === true) {
              has = true;
            }
          }

          if (has === false) {
            allFound = false;
            break;
          }
        }
      }
      // Remove the first value from the stack of traversed values.
      aStack.pop();
      bStack.pop();
      return allFound;
    }
  }

  const bIterator = b[IteratorSymbol]();

  for (const aValue of a) {
    const nextB = bIterator.next();
    if (
      nextB.done ||
      !equals(aValue, nextB.value, [iterableEqualityWithStack])
    ) {
      return false;
    }
  }
  if (!bIterator.next().done) {
    return false;
  }

  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);
  if (!equals(aEntries, bEntries)) {
    return false;
  }

  // Remove the first value from the stack of traversed values.
  aStack.pop();
  bStack.pop();
  return true;
};

const isObject = (a: any) => a !== null && typeof a === 'object';

const isObjectWithKeys = (a: any) =>
  isObject(a) &&
  !(a instanceof Error) &&
  !(a instanceof Array) &&
  !(a instanceof Date);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const subsetEquality = (
  object: any,
  subset: any,
): boolean | undefined => {
  // subsetEquality needs to keep track of the references
  // it has already visited to avoid infinite loops in case
  // there are circular references in the subset passed to it.
  const subsetEqualityWithContext = (
    seenReferences: WeakMap<object, boolean> = new WeakMap(),
  ) => (object: any, subset: any): boolean | undefined => {
    if (!isObjectWithKeys(subset)) {
      return undefined;
    }

    return Object.keys(subset).every(key => {
      if (isObjectWithKeys(subset[key])) {
        if (seenReferences.has(subset[key])) {
          return equals(object[key], subset[key], [iterableEquality]);
        }
        seenReferences.set(subset[key], true);
      }
      const result =
        object != null &&
        hasOwnProperty(object, key) &&
        equals(object[key], subset[key], [
          iterableEquality,
          subsetEqualityWithContext(seenReferences),
        ]);
      // The main goal of using seenReference is to avoid circular node on tree.
      // It will only happen within a parent and its child, not a node and nodes next to it (same level)
      // We should keep the reference for a parent and its child only
      // Thus we should delete the reference immediately so that it doesn't interfere
      // other nodes within the same level on tree.
      seenReferences.delete(subset[key]);
      return result;
    });
  };

  return subsetEqualityWithContext()(object, subset);
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const typeEquality = (a: any, b: any): boolean | undefined => {
  if (a == null || b == null || a.constructor === b.constructor) {
    return undefined;
  }

  return false;
};

export const sparseArrayEquality = (
  a: unknown,
  b: unknown,
): boolean | undefined => {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return undefined;
  }

  // A sparse array [, , 1] will have keys ["2"] whereas [undefined, undefined, 1] will have keys ["0", "1", "2"]
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    equals(a, b, [iterableEquality, typeEquality], true) && equals(aKeys, bKeys)
  );
};

export const partition = <T>(
  items: Array<T>,
  predicate: (arg: T) => boolean,
): [Array<T>, Array<T>] => {
  const result: [Array<T>, Array<T>] = [[], []];

  items.forEach(item => result[predicate(item) ? 0 : 1].push(item));

  return result;
};

// Copied from https://github.com/graingert/angular.js/blob/a43574052e9775cbc1d7dd8a086752c979b0f020/src/Angular.js#L685-L693
export const isError = (value: unknown): value is Error => {
  switch (Object.prototype.toString.call(value)) {
    case '[object Error]':
      return true;
    case '[object Exception]':
      return true;
    case '[object DOMException]':
      return true;
    default:
      return value instanceof Error;
  }
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function emptyObject(obj: any): boolean {
  return obj && typeof obj === 'object' ? !Object.keys(obj).length : false;
}

const MULTILINE_REGEXP = /[\r\n]/;

export const isOneline = (expected: unknown, received: unknown): boolean =>
  typeof expected === 'string' &&
  typeof received === 'string' &&
  (!MULTILINE_REGEXP.test(expected) || !MULTILINE_REGEXP.test(received));
