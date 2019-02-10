/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ModuleMap as _ModuleMap,
  SerializableModuleMap as _SerializableModuleMap,
  FS,
} from 'jest-haste-map';
import type {Path} from 'types/Config';

export type HasteFS = FS;
export type ModuleMap = _ModuleMap;
export type SerializableModuleMap = _SerializableModuleMap;

export type FileData = Map<Path, FileMetaData>;
export type MockData = Map<string, Path>;
export type ModuleMapData = Map<string, ModuleMapItem>;
export type WatchmanClocks = Map<Path, string>;
export type HasteRegExp = RegExp | ((str: string) => boolean);

export type DuplicatesSet = Map<string, /* type */ number>;
export type DuplicatesIndex = Map<string, Map<string, DuplicatesSet>>;

export type InternalHasteMap = {|
  clocks: WatchmanClocks,
  duplicates: DuplicatesIndex,
  files: FileData,
  map: ModuleMapData,
  mocks: MockData,
|};

export type HasteMap = {|
  hasteFS: HasteFS,
  moduleMap: ModuleMap,
  __hasteMapForTest?: ?InternalHasteMap,
|};

export type RawModuleMap = {|
  rootDir: Path,
  duplicates: DuplicatesIndex,
  map: ModuleMapData,
  mocks: MockData,
|};

export type FileMetaData = [
  /* id */ string,
  /* mtime */ number,
  /* size */ number,
  /* visited */ 0 | 1,
  /* dependencies */ Array<string>,
  /* sha1 */ ?string,
];

type ModuleMapItem = {[platform: string]: ModuleMetaData, __proto__: null};
export type ModuleMetaData = [Path, /* type */ number];

export type HType = {|
  ID: 0,
  MTIME: 1,
  SIZE: 2,
  VISITED: 3,
  DEPENDENCIES: 4,
  PATH: 0,
  TYPE: 1,
  MODULE: 0,
  PACKAGE: 1,
  GENERIC_PLATFORM: 'g',
  NATIVE_PLATFORM: 'native',
|};

export type HTypeValue = $Values<HType>;
