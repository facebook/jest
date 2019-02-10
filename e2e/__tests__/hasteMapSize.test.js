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
import HasteMap from 'jest-haste-map';
import {cleanup, writeFiles} from '../Utils';
import {sync as realpath} from 'realpath-native';

const DIR = path.resolve(realpath(os.tmpdir()), 'haste_map_size');

beforeEach(() => {
  cleanup(DIR);
  writeFiles(DIR, {
    'file.js': '"abc"',
  });
});
afterEach(() => cleanup(DIR));

const options = {
  extensions: ['js'],
  forceNodeFilesystemAPI: true,
  ignorePattern: / ^/,
  maxWorkers: 2,
  mocksPattern: '',
  name: 'tmp',
  platforms: [],
  retainAllFiles: true,
  rootDir: DIR,
  roots: [DIR],
  useWatchman: false,
  watch: false,
};

test('reports the correct file size', async () => {
  const hasteMap = new HasteMap(options);
  const hasteFS = (await hasteMap.build()).hasteFS;
  expect(hasteFS.getSize(path.join(DIR, 'file.js'))).toBe(5);
});

test('updates the file size when a file changes', async () => {
  const hasteMap = new HasteMap({...options, watch: true});
  await hasteMap.build();

  writeFiles(DIR, {
    'file.js': '"asdf"',
  });
  const {hasteFS} = await new Promise(resolve =>
    hasteMap.once('change', resolve),
  );
  hasteMap.end();
  expect(hasteFS.getSize(path.join(DIR, 'file.js'))).toBe(6);
});
