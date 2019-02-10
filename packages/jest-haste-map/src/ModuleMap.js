/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path} from 'types/Config';
import type {
  DuplicatesSet,
  HTypeValue,
  ModuleMetaData,
  RawModuleMap,
  ModuleMapData,
  DuplicatesIndex,
  MockData,
} from 'types/HasteMap';

import * as fastPath from './lib/fast_path';
import H from './constants';

const EMPTY_OBJ = {};
const EMPTY_MAP = new Map();

export opaque type SerializableModuleMap = {
  // There is no easier way to extract the type of the entries of a Map
  duplicates: $Call<
    typeof Array.from,
    $Call<$PropertyType<DuplicatesIndex, 'entries'>>,
  >,
  map: $Call<typeof Array.from, $Call<$PropertyType<ModuleMapData, 'entries'>>>,
  mocks: $Call<typeof Array.from, $Call<$PropertyType<MockData, 'entries'>>>,
  rootDir: string,
};

export default class ModuleMap {
  _raw: RawModuleMap;
  static DuplicateHasteCandidatesError: Class<DuplicateHasteCandidatesError>;

  constructor(raw: RawModuleMap) {
    this._raw = raw;
  }

  getModule(
    name: string,
    platform: ?string,
    supportsNativePlatform: ?boolean,
    type: ?HTypeValue,
  ): ?Path {
    if (!type) {
      type = H.MODULE;
    }
    const module = this._getModuleMetadata(
      name,
      platform,
      !!supportsNativePlatform,
    );
    if (module && module[H.TYPE] === type) {
      const modulePath = module[H.PATH];
      return modulePath && fastPath.resolve(this._raw.rootDir, modulePath);
    }
    return null;
  }

  getPackage(
    name: string,
    platform: ?string,
    supportsNativePlatform: ?boolean,
  ): ?Path {
    return this.getModule(name, platform, null, H.PACKAGE);
  }

  getMockModule(name: string): ?Path {
    const mockPath =
      this._raw.mocks.get(name) || this._raw.mocks.get(name + '/index');
    return mockPath && fastPath.resolve(this._raw.rootDir, mockPath);
  }

  getRawModuleMap(): RawModuleMap {
    return {
      duplicates: this._raw.duplicates,
      map: this._raw.map,
      mocks: this._raw.mocks,
      rootDir: this._raw.rootDir,
    };
  }

  toJSON(): SerializableModuleMap {
    return {
      duplicates: Array.from(this._raw.duplicates),
      map: Array.from(this._raw.map),
      mocks: Array.from(this._raw.mocks),
      rootDir: this._raw.rootDir,
    };
  }

  static fromJSON(serializableModuleMap: SerializableModuleMap) {
    return new ModuleMap({
      duplicates: new Map(serializableModuleMap.duplicates),
      map: new Map(serializableModuleMap.map),
      mocks: new Map(serializableModuleMap.mocks),
      rootDir: serializableModuleMap.rootDir,
    });
  }

  /**
   * When looking up a module's data, we walk through each eligible platform for
   * the query. For each platform, we want to check if there are known
   * duplicates for that name+platform pair. The duplication logic normally
   * removes elements from the `map` object, but we want to check upfront to be
   * extra sure. If metadata exists both in the `duplicates` object and the
   * `map`, this would be a bug.
   */
  _getModuleMetadata(
    name: string,
    platform: ?string,
    supportsNativePlatform: boolean,
  ): ?ModuleMetaData {
    const map = this._raw.map.get(name) || EMPTY_OBJ;
    const dupMap = this._raw.duplicates.get(name) || EMPTY_MAP;
    if (platform != null) {
      this._assertNoDuplicates(
        name,
        platform,
        supportsNativePlatform,
        dupMap.get(platform),
      );
      if (map[platform] != null) {
        return map[platform];
      }
    }
    if (supportsNativePlatform) {
      this._assertNoDuplicates(
        name,
        H.NATIVE_PLATFORM,
        supportsNativePlatform,
        dupMap.get(H.NATIVE_PLATFORM),
      );
      if (map[H.NATIVE_PLATFORM]) {
        return map[H.NATIVE_PLATFORM];
      }
    }
    this._assertNoDuplicates(
      name,
      H.GENERIC_PLATFORM,
      supportsNativePlatform,
      dupMap.get(H.GENERIC_PLATFORM),
    );
    if (map[H.GENERIC_PLATFORM]) {
      return map[H.GENERIC_PLATFORM];
    }
    return null;
  }

  _assertNoDuplicates(
    name: string,
    platform: string,
    supportsNativePlatform: boolean,
    relativePathSet: ?DuplicatesSet,
  ) {
    if (relativePathSet == null) {
      return;
    }
    // Force flow refinement
    const previousSet = relativePathSet;
    const duplicates = new Map();

    for (const [relativePath, type] of previousSet) {
      const duplicatePath = fastPath.resolve(this._raw.rootDir, relativePath);
      duplicates.set(duplicatePath, type);
    }

    throw new DuplicateHasteCandidatesError(
      name,
      platform,
      supportsNativePlatform,
      duplicates,
    );
  }

  static create(rootDir: Path) {
    return new ModuleMap({
      duplicates: new Map(),
      map: new Map(),
      mocks: new Map(),
      rootDir,
    });
  }
}

class DuplicateHasteCandidatesError extends Error {
  hasteName: string;
  platform: ?string;
  supportsNativePlatform: boolean;
  duplicatesSet: DuplicatesSet;

  constructor(
    name: string,
    platform: string,
    supportsNativePlatform: boolean,
    duplicatesSet: DuplicatesSet,
  ) {
    const platformMessage = getPlatformMessage(platform);
    super(
      `The name \`${name}\` was looked up in the Haste module map. It ` +
        `cannot be resolved, because there exists several different ` +
        `files, or packages, that provide a module for ` +
        `that particular name and platform. ${platformMessage} You must ` +
        `delete or blacklist files until there remains only one of these:\n\n` +
        Array.from(duplicatesSet)
          .map(
            ([dupFilePath, dupFileType]) =>
              `  * \`${dupFilePath}\` (${getTypeMessage(dupFileType)})\n`,
          )
          .sort()
          .join(''),
    );
    this.hasteName = name;
    this.platform = platform;
    this.supportsNativePlatform = supportsNativePlatform;
    this.duplicatesSet = duplicatesSet;
  }
}

function getPlatformMessage(platform: string) {
  if (platform === H.GENERIC_PLATFORM) {
    return 'The platform is generic (no extension).';
  }
  return `The platform extension is \`${platform}\`.`;
}

function getTypeMessage(type: number) {
  switch (type) {
    case H.MODULE:
      return 'module';
    case H.PACKAGE:
      return 'package';
  }
  return 'unknown';
}

ModuleMap.DuplicateHasteCandidatesError = DuplicateHasteCandidatesError;
