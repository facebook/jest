/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
'use strict';

import istanbulCoverage from 'istanbul-lib-coverage';
import libSourceMaps from 'istanbul-lib-source-maps';
import generateEmptyCoverage from '../generateEmptyCoverage';
import Runtime from 'jest-runtime';

const path = require('path');
const os = require('os');
const {makeGlobalConfig, makeProjectConfig} = require('../../../../TestUtils');

jest.spyOn(Runtime, 'shouldInstrument').mockImplementation(() => true);

const src = `
throw new Error('this should not be thrown');

const a = (b, c) => {
  if (b) {
    return c;
  } else {
    return b;
  }
};

module.exports = {
  a,
};`;

it('generates an empty coverage object for a file without running it', () => {
  const coverageMap = istanbulCoverage.createCoverageMap({});
  const sourceMapStore = libSourceMaps.createSourceMapStore();
  const rootDir = '/tmp';
  const filepath = path.join(rootDir, './sum.js');

  const emptyCoverage = generateEmptyCoverage(
    src,
    filepath,
    makeGlobalConfig(),
    makeProjectConfig({
      cacheDirectory: os.tmpdir(),
      rootDir,
      transform: [['^.+\\.js$', require.resolve('babel-jest')]],
    }),
  );

  expect(typeof emptyCoverage).toBe('object');

  let coverage = emptyCoverage && emptyCoverage.coverage;

  if (emptyCoverage && emptyCoverage.sourceMapPath) {
    coverageMap.addFileCoverage(emptyCoverage.coverage);
    sourceMapStore.registerURL(filepath, emptyCoverage.sourceMapPath);

    coverage = sourceMapStore.transformCoverage(coverageMap).map;
  }

  // $FlowFixMe: IDK...
  expect(coverage.data).toMatchSnapshot({path: expect.any(String)});
});
