/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs';
import v8 from 'v8';

type Path = string;

// JSON and V8 serializers are both stable when it comes to compatibility. The
// current JSON specification is well defined in RFC 8259, and V8 ensures that
// the versions are compatible by encoding the serialization version in the own
// generated buffer.

const JS_TYPE = '__$t__';
const JS_VALUE = '__$v__';
const JS_VF = '__$f__';

function replacer(_key: string, value: any): any {
  // NaN cannot be in a switch statement, because NaN !== NaN.
  if (Number.isNaN(value)) {
    return {[JS_TYPE]: 'n'};
  }

  switch (value) {
    case undefined:
      return {[JS_TYPE]: 'u'};
    case +Infinity:
      return {[JS_TYPE]: '+'};
    case -Infinity:
      return {[JS_TYPE]: '-'};
  }

  switch (value && value.constructor) {
    case Date:
      return {[JS_TYPE]: 'd', [JS_VALUE]: value.getTime()};
    case RegExp:
      return {[JS_TYPE]: 'r', [JS_VALUE]: value.source, [JS_VF]: value.flags};
    case Set:
      return {[JS_TYPE]: 's', [JS_VALUE]: Array.from(value)};
    case Map:
      return {[JS_TYPE]: 'm', [JS_VALUE]: Array.from(value)};
    case Buffer:
      return {[JS_TYPE]: 'b', [JS_VALUE]: value.toString('latin1')};
  }

  return value;
}

function reviver(_key: string, value: any): any {
  if (!value || (typeof value !== 'object' && !value.hasOwnProperty(JS_TYPE))) {
    return value;
  }

  switch (value[JS_TYPE]) {
    case 'u':
      return undefined;
    case 'n':
      return NaN;
    case '+':
      return +Infinity;
    case '-':
      return -Infinity;
    case 'd':
      return new Date(value[JS_VALUE]);
    case 'r':
      return new RegExp(value[JS_VALUE], value[JS_VF]);
    case 's':
      return new Set(value[JS_VALUE]);
    case 'm':
      return new Map(value[JS_VALUE]);
    case 'b':
      return Buffer.from(value[JS_VALUE], 'latin1');
  }

  return value;
}

function jsonStringify(content: unknown) {
  // Not pretty, but the ES JSON spec says that "toJSON" will be called before
  // getting into your replacer, so we have to remove them beforehand. See
  // https://www.ecma-international.org/ecma-262/#sec-serializejsonproperty
  // section 2.b for more information.

  const dateToJSON = Date.prototype.toJSON;
  const bufferToJSON = Buffer.prototype.toJSON;

  /* eslint-disable no-extend-native */

  try {
    // @ts-ignore intentional removal of "toJSON" property.
    Date.prototype.toJSON = undefined;
    // @ts-ignore intentional removal of "toJSON" property.
    Buffer.prototype.toJSON = undefined;

    return JSON.stringify(content, replacer);
  } finally {
    Date.prototype.toJSON = dateToJSON;
    Buffer.prototype.toJSON = bufferToJSON;
  }

  /* eslint-enable no-extend-native */
}

function jsonParse(content: string) {
  return JSON.parse(content, reviver);
}

// In memory functions.

export function deserialize(buffer: Buffer): any {
  return v8.deserialize
    ? v8.deserialize(buffer)
    : jsonParse(buffer.toString('utf8'));
}

export function serialize(content: unknown): Buffer {
  return v8.serialize
    ? v8.serialize(content)
    : Buffer.from(jsonStringify(content));
}

// Synchronous filesystem functions.

export function readFileSync(filePath: Path): any {
  return v8.deserialize
    ? v8.deserialize(fs.readFileSync(filePath))
    : jsonParse(fs.readFileSync(filePath, 'utf8'));
}

export function writeFileSync(filePath: Path, content: any) {
  return v8.serialize
    ? fs.writeFileSync(filePath, v8.serialize(content))
    : fs.writeFileSync(filePath, jsonStringify(content), 'utf8');
}

export default {
  deserialize,
  readFileSync,
  serialize,
  writeFileSync,
};
