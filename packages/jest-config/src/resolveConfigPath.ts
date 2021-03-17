/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import * as fs from 'graceful-fs';
import type {Config} from '@jest/types';
import {
  JEST_CONFIG_BASE_NAME,
  JEST_CONFIG_EXT_ORDER,
  PACKAGE_JSON,
} from './constants';

const isFile = (filePath: Config.Path) =>
  fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory();

const getConfigFilename = (ext: string) => JEST_CONFIG_BASE_NAME + ext;

export default (pathToResolve: Config.Path, cwd: Config.Path): Config.Path => {
  if (!path.isAbsolute(cwd)) {
    throw new Error(`"cwd" must be an absolute path. cwd: ${cwd}`);
  }
  const absolutePath = path.isAbsolute(pathToResolve)
    ? pathToResolve
    : path.resolve(cwd, pathToResolve);

  if (isFile(absolutePath)) {
    return absolutePath;
  }

  // This is a guard against passing non existing path as a project/config,
  // that will otherwise result in a very confusing situation.
  // e.g.
  // With a directory structure like this:
  //   my_project/
  //     packcage.json
  //
  // Passing a `my_project/some_directory_that_doesnt_exist` as a project
  // name will resolve into a (possibly empty) `my_project/package.json` and
  // try to run all tests it finds under `my_project` directory.
  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Can't find a root directory while resolving a config file path.\n` +
        `Provided path to resolve: ${pathToResolve}\n` +
        `cwd: ${cwd}`,
    );
  }

  return resolveConfigPathByTraversing(absolutePath, pathToResolve, cwd);
};

const resolveConfigPathByTraversing = (
  pathToResolve: Config.Path,
  initialPath: Config.Path,
  cwd: Config.Path,
): Config.Path => {
  let correctConfig = '';
  let foundedConfig = 0;
  const jestConfig = JEST_CONFIG_EXT_ORDER.map(ext =>
    path.resolve(pathToResolve, getConfigFilename(ext)),
  ).find(isFile);
  if (jestConfig) {
    ++foundedConfig;
    correctConfig = jestConfig;
  }

  const packageJson = path.resolve(pathToResolve, PACKAGE_JSON);
  if (isFile(packageJson)) {
    ++foundedConfig;
    correctConfig = packageJson;
  }

  //Warning when we have multiple configurations
  if (correctConfig) {
    if (foundedConfig > 1) {
      correctConfig = jestConfig || packageJson;
      console.warn(multipleConfigsWarn);
    }
    return correctConfig;
  }

  // This is the system root.
  // We tried everything, config is nowhere to be found ¯\_(ツ)_/¯
  if (pathToResolve === path.dirname(pathToResolve)) {
    throw new Error(makeResolutionErrorMessage(initialPath, cwd));
  }

  // go up a level and try it again
  return resolveConfigPathByTraversing(
    path.dirname(pathToResolve),
    initialPath,
    cwd,
  );
};

const makeResolutionErrorMessage = (
  initialPath: Config.Path,
  cwd: Config.Path,
) =>
  'Could not find a config file based on provided values:\n' +
  `path: "${initialPath}"\n` +
  `cwd: "${cwd}"\n` +
  'Config paths must be specified by either a direct path to a config\n' +
  'file, or a path to a directory. If directory is given, Jest will try to\n' +
  `traverse directory tree up, until it finds one of those files in exact order: ${JEST_CONFIG_EXT_ORDER.map(
    ext => `"${getConfigFilename(ext)}"`,
  ).join(' or ')}.`;

const multipleConfigsWarn =
  '● Multiple configurations found:\n\n' +
  'Jest will use `path/to/jest.config.js` for configuration, but Jest also\n' +
  'found configuration in `path/to/package.json`. Delete the `"jest"` key\n' +
  'in that file to silence this warning, or delete the `jest.config.js` file\n' +
  'to use the configuration from `package.json`.\n\n' +
  'Configuration Documentation:\n' +
  'https://jestjs.io/docs/en/configuration.html\n';
