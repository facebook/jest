/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const EMPTY = new Set();

export type DeepCyclicCopyOptions = {
  blacklist?: Set<string>;
  keepPrototype?: boolean;
};

// Node 6 does not have gOPDs, so we define a simple polyfill for it.
if (!Object.getOwnPropertyDescriptors) {
  // @ts-ignore: polyfill
  Object.getOwnPropertyDescriptors = obj => {
    const list: {[key: string]: PropertyDescriptor | undefined} = {};

    (Object.getOwnPropertyNames(obj) as Array<string | symbol>)
      .concat(Object.getOwnPropertySymbols(obj))
      .forEach(key => {
        // @ts-ignore: assignment with a Symbol is OK.
        list[key] = Object.getOwnPropertyDescriptor(obj, key);
      });

    return list;
  };
}

export default function deepCyclicCopy<T>(
  value: T,
  options: DeepCyclicCopyOptions = {blacklist: EMPTY, keepPrototype: false},
  cycles: WeakMap<any, any> = new WeakMap(),
): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  } else if (cycles.has(value)) {
    return cycles.get(value);
  } else if (Array.isArray(value)) {
    return deepCyclicCopyArray(value, options, cycles);
  } else {
    return deepCyclicCopyObject(value, options, cycles);
  }
}

function deepCyclicCopyObject<T>(
  object: T,
  options: DeepCyclicCopyOptions,
  cycles: WeakMap<any, any>,
): T {
  const newObject = options.keepPrototype
    ? Object.create(Object.getPrototypeOf(object))
    : {};

  // $FlowFixMe: Object.getOwnPropertyDescriptors is polyfilled above.
  const descriptors = Object.getOwnPropertyDescriptors(object);

  cycles.set(object, newObject);

  Object.keys(descriptors).forEach(key => {
    if (options.blacklist && options.blacklist.has(key)) {
      delete descriptors[key];
      return;
    }

    const descriptor = descriptors[key];
    if (typeof descriptor.value !== 'undefined') {
      descriptor.value = deepCyclicCopy(
        descriptor.value,
        {blacklist: EMPTY, keepPrototype: options.keepPrototype},
        cycles,
      );
    }

    descriptor.configurable = true;
  });

  return Object.defineProperties(newObject, descriptors);
}

function deepCyclicCopyArray<T>(
  array: Array<T>,
  options: DeepCyclicCopyOptions,
  cycles: WeakMap<any, any>,
): T {
  const newArray = options.keepPrototype
    ? new (Object.getPrototypeOf(array)).constructor(array.length)
    : [];
  const length = array.length;

  cycles.set(array, newArray);

  for (let i = 0; i < length; i++) {
    newArray[i] = deepCyclicCopy(
      array[i],
      {blacklist: EMPTY, keepPrototype: options.keepPrototype},
      cycles,
    );
  }

  return newArray;
}
