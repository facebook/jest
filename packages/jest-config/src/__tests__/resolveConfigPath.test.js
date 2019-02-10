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
import resolveConfigPath from '../resolveConfigPath';

const {cleanup, writeFiles} = require('../../../../e2e/Utils');

const DIR = path.resolve(os.tmpdir(), 'resolve_config_path_test');
const ERROR_PATTERN = /Could not find a config file based on provided values/;
const NO_ROOT_DIR_ERROR_PATTERN = /Can\'t find a root directory/;

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));

test('file path', () => {
  const relativeConfigPath = 'a/b/c/my_config.js';
  const absoluteConfigPath = path.resolve(DIR, relativeConfigPath);

  writeFiles(DIR, {[relativeConfigPath]: ''});

  // absolute
  expect(resolveConfigPath(absoluteConfigPath, DIR)).toBe(absoluteConfigPath);
  expect(() => resolveConfigPath('/does_not_exist', DIR)).toThrowError(
    NO_ROOT_DIR_ERROR_PATTERN,
  );

  // relative
  expect(resolveConfigPath(relativeConfigPath, DIR)).toBe(absoluteConfigPath);
  expect(() => resolveConfigPath('does_not_exist', DIR)).toThrowError(
    NO_ROOT_DIR_ERROR_PATTERN,
  );
});

test('directory path', () => {
  const relativePackageJsonPath = 'a/b/c/package.json';
  const absolutePackageJsonPath = path.resolve(DIR, relativePackageJsonPath);
  const relativeJestConfigPath = 'a/b/c/jest.config.js';
  const absoluteJestConfigPath = path.resolve(DIR, relativeJestConfigPath);

  writeFiles(DIR, {'a/b/c/some_random_file.js': ''});

  // no configs yet. should throw
  expect(() =>
    // absolute
    resolveConfigPath(path.dirname(absoluteJestConfigPath), DIR),
  ).toThrowError(ERROR_PATTERN);

  expect(() =>
    // relative
    resolveConfigPath(path.dirname(relativeJestConfigPath), DIR),
  ).toThrowError(ERROR_PATTERN);

  writeFiles(DIR, {[relativePackageJsonPath]: ''});

  // absolute
  expect(resolveConfigPath(path.dirname(absolutePackageJsonPath), DIR)).toBe(
    absolutePackageJsonPath,
  );

  // relative
  expect(resolveConfigPath(path.dirname(relativePackageJsonPath), DIR)).toBe(
    absolutePackageJsonPath,
  );

  writeFiles(DIR, {[relativeJestConfigPath]: ''});

  // jest.config.js takes presedence

  // absolute
  expect(resolveConfigPath(path.dirname(absolutePackageJsonPath), DIR)).toBe(
    absoluteJestConfigPath,
  );

  // relative
  expect(resolveConfigPath(path.dirname(relativePackageJsonPath), DIR)).toBe(
    absoluteJestConfigPath,
  );

  expect(() => {
    resolveConfigPath(
      path.join(path.dirname(relativePackageJsonPath), 'j/x/b/m/'),
      DIR,
    );
  }).toThrowError(NO_ROOT_DIR_ERROR_PATTERN);
});
