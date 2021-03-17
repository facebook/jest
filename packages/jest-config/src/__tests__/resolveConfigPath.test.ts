/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import * as path from 'path';
import {cleanup, writeFiles} from '../../../../e2e/Utils';
import {JEST_CONFIG_EXT_ORDER} from '../constants';
import resolveConfigPath from '../resolveConfigPath';

const DIR = path.resolve(tmpdir(), 'resolve_config_path_test');
const ERROR_PATTERN = /Could not find a config file based on provided values/;
const NO_ROOT_DIR_ERROR_PATTERN = /Can't find a root directory/;

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));

describe.each(JEST_CONFIG_EXT_ORDER.slice(0))(
  'Resolve config path %s',
  extension => {
    test(`file path with "${extension}"`, () => {
      const relativeConfigPath = `a/b/c/my_config${extension}`;
      const absoluteConfigPath = path.resolve(DIR, relativeConfigPath);
      const warn = console.warn;
      console.warn = jest.fn();

      writeFiles(DIR, {[relativeConfigPath]: ''});

      // absolute
      expect(resolveConfigPath(absoluteConfigPath, DIR)).toBe(
        absoluteConfigPath,
      );
      expect(() => resolveConfigPath('/does_not_exist', DIR)).toThrowError(
        NO_ROOT_DIR_ERROR_PATTERN,
      );

      // relative
      expect(resolveConfigPath(relativeConfigPath, DIR)).toBe(
        absoluteConfigPath,
      );
      expect(() => resolveConfigPath('does_not_exist', DIR)).toThrowError(
        NO_ROOT_DIR_ERROR_PATTERN,
      );
      expect(console.warn).toHaveBeenCalledTimes(0);
      console.warn = warn;
    });

    test(`directory path with "${extension}"`, () => {
      const relativePackageJsonPath = 'a/b/c/package.json';
      const absolutePackageJsonPath = path.resolve(
        DIR,
        relativePackageJsonPath,
      );
      const relativeJestConfigPath = `a/b/c/jest.config${extension}`;
      const absoluteJestConfigPath = path.resolve(DIR, relativeJestConfigPath);
      const warn = console.warn;
      console.warn = jest.fn();

      writeFiles(DIR, {[`a/b/c/some_random_file${extension}`]: ''});

      // no configs yet. should throw
      expect(() =>
        // absolute
        resolveConfigPath(path.dirname(absoluteJestConfigPath), DIR),
      ).toThrowError(ERROR_PATTERN);

      expect(() =>
        // relative
        resolveConfigPath(path.dirname(relativeJestConfigPath), DIR),
      ).toThrowError(ERROR_PATTERN);

      expect(console.warn).toHaveBeenCalledTimes(0);

      writeFiles(DIR, {[relativePackageJsonPath]: ''});

      // absolute
      expect(
        resolveConfigPath(path.dirname(absolutePackageJsonPath), DIR),
      ).toBe(absolutePackageJsonPath);

      // relative
      expect(
        resolveConfigPath(path.dirname(relativePackageJsonPath), DIR),
      ).toBe(absolutePackageJsonPath);

      expect(console.warn).toHaveBeenCalledTimes(0);

      writeFiles(DIR, {[relativeJestConfigPath]: ''});

      // jest.config.js takes precedence

      // absolute
      expect(
        resolveConfigPath(path.dirname(absolutePackageJsonPath), DIR),
      ).toBe(absoluteJestConfigPath);

      expect(console.warn).toHaveBeenCalledTimes(1);

      // relative
      expect(
        resolveConfigPath(path.dirname(relativePackageJsonPath), DIR),
      ).toBe(absoluteJestConfigPath);

      expect(console.warn).toHaveBeenCalledTimes(2);

      expect(() => {
        resolveConfigPath(
          path.join(path.dirname(relativePackageJsonPath), 'j/x/b/m/'),
          DIR,
        );
      }).toThrowError(NO_ROOT_DIR_ERROR_PATTERN);

      expect(console.warn).toHaveBeenCalledTimes(2);
      console.warn = warn;
    });
  },
);
