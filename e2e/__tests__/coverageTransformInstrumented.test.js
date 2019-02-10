/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {readFileSync} from 'fs';
import path from 'path';
import {cleanup, run} from '../Utils';
import runJest from '../runJest';

const dir = path.resolve(__dirname, '../coverage-transform-instrumented');
const coverageDir = path.join(dir, 'coverage');

beforeAll(() => {
  cleanup(coverageDir);
});

it('code coverage for transform instrumented code', () => {
  run('yarn', dir);
  const result = runJest(dir, ['--coverage', '--no-cache']);

  expect(result.status).toBe(0);

  const coverageMapFile = path.join(coverageDir, 'coverage-final.json');
  const coverageMap = JSON.parse(readFileSync(coverageMapFile, 'utf-8'));

  // reduce absolute paths embedded in the coverage map to just filenames
  Object.keys(coverageMap).forEach(filename => {
    coverageMap[filename].path = path.basename(coverageMap[filename].path);
    delete coverageMap[filename].hash;
    coverageMap[path.basename(filename)] = coverageMap[filename];
    delete coverageMap[filename];
  });
  expect(coverageMap).toMatchSnapshot();
});
