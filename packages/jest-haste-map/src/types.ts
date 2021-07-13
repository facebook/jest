/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Stats} from 'graceful-fs';
import type {Config} from '@jest/types';
import type HasteFS from './HasteFS';
import type ModuleMap from './ModuleMap';

type ValueType<T> = T extends Map<string, infer V> ? V : never;

export type SerializableModuleMap = {
  duplicates: ReadonlyArray<[string, [string, [string, [string, number]]]]>;
  map: ReadonlyArray<[string, ValueType<ModuleMapData>]>;
  mocks: ReadonlyArray<[string, ValueType<MockData>]>;
  rootDir: Config.Path;
};

export interface IModuleMap<S = SerializableModuleMap> {
  getModule(
    name: string,
    platform?: string | null,
    supportsNativePlatform?: boolean | null,
    type?: HTypeValue | null,
  ): Config.Path | null;

  getPackage(
    name: string,
    platform: string | null | undefined,
    _supportsNativePlatform: boolean | null,
  ): Config.Path | null;

  getMockModule(name: string): Config.Path | undefined;

  getRawModuleMap(): RawModuleMap;

  toJSON(): S;
}

export type HasteMapStatic<S = SerializableModuleMap> = {
  getCacheFilePath(
    tmpdir: Config.Path,
    name: string,
    ...extra: Array<string>
  ): string;
  getModuleMapFromJSON(json: S): IModuleMap<S>;
};

export type IgnoreMatcher = (item: string) => boolean;

export type WorkerMessage = {
  computeDependencies: boolean;
  computeSha1: boolean;
  dependencyExtractor?: string | null;
  rootDir: string;
  filePath: string;
  hasteImplModulePath?: string;
};

export type WorkerMetadata = {
  dependencies: Array<string> | undefined | null;
  id: string | undefined | null;
  module: ModuleMetaData | undefined | null;
  sha1: string | undefined | null;
};

export type CrawlerOptions = {
  computeSha1: boolean;
  enableSymlinks: boolean;
  data: InternalHasteMap;
  extensions: Array<string>;
  forceNodeFilesystemAPI: boolean;
  ignore: IgnoreMatcher;
  rootDir: string;
  roots: Array<string>;
};

export type HasteImpl = {
  getHasteName(filePath: Config.Path): string | undefined;
};

export type FileData = Map<Config.Path, FileMetaData>;

export type FileMetaData = [
  id: string,
  mtime: number,
  size: number,
  visited: 0 | 1,
  dependencies: string,
  sha1: string | null | undefined,
];

export type MockData = Map<string, Config.Path>;
export type ModuleMapData = Map<string, ModuleMapItem>;
export type WatchmanClockSpec = string | {scm: {'mergebase-with': string}};
export type WatchmanClocks = Map<Config.Path, WatchmanClockSpec>;
export type HasteRegExp = RegExp | ((str: string) => boolean);

export type DuplicatesSet = Map<string, /* type */ number>;
export type DuplicatesIndex = Map<string, Map<string, DuplicatesSet>>;

export type InternalHasteMap = {
  clocks: WatchmanClocks;
  duplicates: DuplicatesIndex;
  files: FileData;
  map: ModuleMapData;
  mocks: MockData;
};

export type IHasteMap = {
  hasteFS: HasteFS;
  moduleMap: IModuleMap;
  __hasteMapForTest?: InternalHasteMap | null;
};

export type HasteMap = {
  hasteFS: HasteFS;
  moduleMap: ModuleMap;
  __hasteMapForTest?: InternalHasteMap | null;
};

export type RawModuleMap = {
  rootDir: Config.Path;
  duplicates: DuplicatesIndex;
  map: ModuleMapData;
  mocks: MockData;
};

type ModuleMapItem = {[platform: string]: ModuleMetaData};
export type ModuleMetaData = [path: Config.Path, type: number];

export type HType = {
  ID: 0;
  MTIME: 1;
  SIZE: 2;
  VISITED: 3;
  DEPENDENCIES: 4;
  SHA1: 5;
  PATH: 0;
  TYPE: 1;
  MODULE: 0;
  PACKAGE: 1;
  GENERIC_PLATFORM: 'g';
  NATIVE_PLATFORM: 'native';
  DEPENDENCY_DELIM: '\0';
};

export type HTypeValue = HType[keyof HType];

export type EventsQueue = Array<{
  filePath: Config.Path;
  stat: Stats | undefined;
  type: string;
}>;

export type ChangeEvent = {
  eventsQueue: EventsQueue;
  hasteFS: HasteFS;
  moduleMap: ModuleMap;
};
