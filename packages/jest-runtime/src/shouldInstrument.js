/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path, ProjectConfig} from 'types/Config';
import type {Options} from './ScriptTransformer';

import path from 'path';
import {escapePathForRegex} from 'jest-regex-util';
import {replacePathSepForGlob} from 'jest-util';
import micromatch from 'micromatch';

const MOCKS_PATTERN = new RegExp(
  escapePathForRegex(path.sep + '__mocks__' + path.sep),
);

export default function shouldInstrument(
  filename: Path,
  options: Options,
  config: ProjectConfig,
): boolean {
  if (!options.collectCoverage) {
    return false;
  }

  if (
    config.forceCoverageMatch &&
    config.forceCoverageMatch.length &&
    micromatch.any(filename, config.forceCoverageMatch)
  ) {
    return true;
  }

  if (
    !config.testPathIgnorePatterns ||
    !config.testPathIgnorePatterns.some(pattern => filename.match(pattern))
  ) {
    if (
      config.testRegex &&
      config.testRegex.some(regex => new RegExp(regex).test(filename))
    ) {
      return false;
    }

    if (
      config.testMatch &&
      config.testMatch.length &&
      micromatch.some(replacePathSepForGlob(filename), config.testMatch)
    ) {
      return false;
    }
  }

  if (
    // This configuration field contains an object in the form of:
    // {'path/to/file.js': true}
    options.collectCoverageOnlyFrom &&
    !options.collectCoverageOnlyFrom[filename]
  ) {
    return false;
  }

  if (
    // still cover if `only` is specified
    !options.collectCoverageOnlyFrom &&
    options.collectCoverageFrom &&
    !micromatch.some(
      replacePathSepForGlob(path.relative(config.rootDir, filename)),
      options.collectCoverageFrom,
    )
  ) {
    return false;
  }

  if (
    config.coveragePathIgnorePatterns &&
    config.coveragePathIgnorePatterns.some(pattern => filename.match(pattern))
  ) {
    return false;
  }

  if (config.globalSetup === filename) {
    return false;
  }

  if (config.globalTeardown === filename) {
    return false;
  }

  if (
    //TODO: Remove additional check when normalized config provided in unit test
    config.setupFiles &&
    config.setupFiles.some(setupFile => setupFile === filename)
  ) {
    return false;
  }

  if (
    //TODO: Remove additional check when normalized config provided in unit test
    config.setupFilesAfterEnv &&
    config.setupFilesAfterEnv.some(setupFile => setupFile === filename)
  ) {
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
