/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
type ValueType =
  | 'array'
  | 'bigint'
  | 'boolean'
  | 'function'
  | 'null'
  | 'number'
  | 'object'
  | 'regexp'
  | 'map'
  | 'set'
  | 'date'
  | 'string'
  | 'symbol'
  | 'undefined'
  | 'error'
  | 'Number'
  | 'String'
  | 'Boolean';

export function getType(value: unknown): ValueType {
  if (value === undefined) {
    return 'undefined';
  } else if (value === null) {
    return 'null';
  } else if (Array.isArray(value)) {
    return 'array';
  } else if (typeof value === 'boolean') {
    return 'boolean';
  } else if (typeof value === 'function') {
    return 'function';
  } else if (typeof value === 'number') {
    return 'number';
  } else if (typeof value === 'string') {
    return 'string';
  } else if (typeof value === 'bigint') {
    return 'bigint';
  } else if (typeof value === 'object') {
    if (value != null) {
      switch (value.constructor) {
        case RegExp:
          return 'regexp';
        case Map:
          return 'map';
        case Set:
          return 'set';
        case Date:
          return 'date';
        case Error:
          return 'error';
        case Number:
          return 'Number';
        case String:
          return 'String';
        case Boolean:
          return 'Boolean';
      }
    }
    return 'object';
  } else if (typeof value === 'symbol') {
    return 'symbol';
  }

  throw new Error(`value of unknown type: ${value}`);
}

export function isLeafType(a: unknown): boolean {
  return [
    'number',
    'null',
    'undefined',
    'boolean',
    'date',
    'regexp',
    'function',
    'error',
    'Number',
    'String',
    'Boolean',
  ].includes(getType(a));
}
