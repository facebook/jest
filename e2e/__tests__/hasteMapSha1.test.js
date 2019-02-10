/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import os from 'os';
import path from 'path';
import JestHasteMap from 'jest-haste-map';
import {cleanup, writeFiles} from '../Utils';

const DIR = path.resolve(os.tmpdir(), 'haste_map_sha1');

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));

test('exits the process after test are done but before timers complete', async () => {
  writeFiles(DIR, {
    'file.android.js': '"foo android"',
    'file.ios.js': '"foo ios"',
    'file.js': '"foo default"',
    'fileWithExtension.ignored': '"ignored file"',
    'node_modules/bar/fileWithExtension.ignored': '"ignored node modules"',
    'node_modules/bar/image.png': '"an image"',
    'node_modules/bar/index.js': '"node modules bar"',
  });

  const haste = new JestHasteMap({
    computeSha1: true,
    extensions: ['js', 'json', 'png'],
    forceNodeFilesystemAPI: true,
    ignorePattern: / ^/,
    maxWorkers: 2,
    mocksPattern: '',
    name: 'tmp',
    platforms: ['ios', 'android'],
    retainAllFiles: true,
    rootDir: DIR,
    roots: [DIR],
    useWatchman: false,
    watch: false,
  });

  const {hasteFS} = await haste.build();

  expect(hasteFS.getSha1(path.join(DIR, 'file.android.js'))).toBe(
    'e376f9fd9a96d000fa019020159f996a8855f8bc',
  );

  expect(hasteFS.getSha1(path.join(DIR, 'file.ios.js'))).toBe(
    '1271b4db2a5f47ae46cb01a1d0604a94d401e8f7',
  );

  expect(hasteFS.getSha1(path.join(DIR, 'file.js'))).toBe(
    'c26c852220977244418f17a9fdc4ae9c192b3188',
  );

  expect(hasteFS.getSha1(path.join(DIR, 'node_modules/bar/image.png'))).toBe(
    '8688f7e11f63d8a7eac7cb87af850337fabbd400',
  );

  expect(hasteFS.getSha1(path.join(DIR, 'node_modules/bar/index.js'))).toBe(
    'ee245b9fbd45e1f6ad300eb2f5484844f6b5a34c',
  );

  // Ignored files do not get the SHA-1 computed.

  expect(hasteFS.getSha1(path.join(DIR, 'fileWithExtension.ignored'))).toBe(
    null,
  );

  expect(
    hasteFS.getSha1(
      path.join(DIR, 'node_modules/bar/fileWithExtension.ignored'),
    ),
  ).toBe(null);
});
