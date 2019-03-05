/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs';
import {Config} from '@jest/types';
import ModuleMap from './ModuleMap';
import HasteFS from './HasteFS';

export type IgnoreMatcher = (item: string) => boolean;
export type Mapper = (item: string) => Array<string> | null;

export type WorkerMessage = {
  computeDependencies: boolean;
  computeSha1: boolean;
  dependencyExtractor?: string;
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
  data: InternalHasteMap;
  extensions: Array<string>;
  forceNodeFilesystemAPI: boolean;
  ignore: IgnoreMatcher;
  mapper?: Mapper | null;
  rootDir: string;
  roots: Array<string>;
};

export type HasteImpl = {
  getHasteName(filePath: Config.Path): string | undefined;
};

export type FileData = Map<Config.Path, FileMetaData>;
export type LinkData = Map<Config.Path, LinkMetaData>;

export type FileMetaData = [
  /* id */ string,
  /* mtime */ number,
  /* size */ number,
  /* visited */ 0 | 1,
  /* dependencies */ Array<string>,
  /* sha1 */ string | null | undefined
];

export type LinkMetaData = [
  /* target */ string | undefined,
  /* mtime */ number
];

export type MockData = Map<string, Config.Path>;
export type ModuleMapData = Map<string, ModuleMapItem>;
export type WatchmanClocks = Map<Config.Path, string>;
export type HasteRegExp = RegExp | ((str: string) => boolean);

export type DuplicatesSet = Map<string, /* type */ number>;
export type DuplicatesIndex = Map<string, Map<string, DuplicatesSet>>;

export type InternalHasteMap = {
  clocks: WatchmanClocks;
  duplicates: DuplicatesIndex;
  files: FileData;
  links: LinkData;
  roots: Config.Path[];
  map: ModuleMapData;
  mocks: MockData;
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
export type ModuleMetaData = [Config.Path, /* type */ number];

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
};

export type HTypeValue = HType[keyof HType];

export type EventsQueue = Array<{
  filePath: Config.Path;
  stat: fs.Stats | undefined;
  type: string;
}>;

export type ChangeEvent = {
  eventsQueue: EventsQueue;
  hasteFS: HasteFS;
  moduleMap: ModuleMap;
};
