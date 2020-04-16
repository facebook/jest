/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import type {Config} from '@jest/types';
import {escapePathForRegex} from 'jest-regex-util';
import {replacePathSepForGlob} from 'jest-util';
import micromatch = require('micromatch');
import type {ShouldInstrumentOptions} from './types';

const MOCKS_PATTERN = new RegExp(
  escapePathForRegex(path.sep + '__mocks__' + path.sep),
);

export default function shouldInstrument(
  filename: Config.Path,
  options: ShouldInstrumentOptions,
  config: Config.ProjectConfig,
): boolean {
  if (!options.collectCoverage) {
    return false;
  }

  if (
    config.forceCoverageMatch.length &&
    micromatch.any(filename, config.forceCoverageMatch)
  ) {
    return true;
  }

  if (
    !config.testPathIgnorePatterns.some(pattern => !!filename.match(pattern))
  ) {
    if (config.testRegex.some(regex => new RegExp(regex).test(filename))) {
      return false;
    }

    if (
      micromatch([replacePathSepForGlob(filename)], config.testMatch).length
    ) {
      return false;
    }
  }

  if (
    // This configuration field contains an object in the form of:
    // {'path/to/file.js': true}
    config.collectCoverageOnlyFrom &&
    !config.collectCoverageOnlyFrom[filename]
  ) {
    return false;
  }

  if (
    // still cover if `only` is specified
    !config.collectCoverageOnlyFrom &&
    config.collectCoverageFrom.length &&
    micromatch(
      [replacePathSepForGlob(path.relative(config.rootDir, filename))],
      config.collectCoverageFrom,
    ).length === 0
  ) {
    return false;
  }

  if (
    config.coveragePathIgnorePatterns.some(pattern => !!filename.match(pattern))
  ) {
    return false;
  }

  if (config.globalSetup === filename) {
    return false;
  }

  if (config.globalTeardown === filename) {
    return false;
  }

  if (config.setupFiles.includes(filename)) {
    return false;
  }

  if (config.setupFilesAfterEnv.includes(filename)) {
    return false;
  }

  if (MOCKS_PATTERN.test(filename)) {
    return false;
  }

  if (options.changedFiles && !options.changedFiles.has(filename)) {
    return false;
  }

  return true;
}
