/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type MockFunctionMetadataType =
  | 'object'
  | 'array'
  | 'regexp'
  | 'function'
  | 'constant'
  | 'collection'
  | 'null'
  | 'undefined';

export type MockFunctionMetadata<
  T,
  Y extends unknown[],
  Type = MockFunctionMetadataType
> = {
  ref?: number;
  members?: {[key: string]: MockFunctionMetadata<T, Y>};
  mockImpl?: (...args: Y) => T;
  name?: string;
  refID?: number;
  type?: Type;
  value?: T;
  length?: number;
};
