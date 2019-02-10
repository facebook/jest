/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path} from 'types/Config';

import path from 'path';
import fs from 'fs';
import {JEST_CONFIG, PACKAGE_JSON} from './constants';

const isFile = filePath =>
  fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory();

export default (pathToResolve: Path, cwd: Path): Path => {
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
  pathToResolve: Path,
  initialPath: Path,
  cwd: Path,
) => {
  const jestConfig = path.resolve(pathToResolve, JEST_CONFIG);
  if (isFile(jestConfig)) {
    return jestConfig;
  }

  const packageJson = path.resolve(pathToResolve, PACKAGE_JSON);
  if (isFile(packageJson)) {
    return packageJson;
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

const makeResolutionErrorMessage = (initialPath: Path, cwd: Path) =>
  'Could not find a config file based on provided values:\n' +
  `path: "${initialPath}"\n` +
  `cwd: "${cwd}"\n` +
  'Config paths must be specified by either a direct path to a config\n' +
  'file, or a path to a directory. If directory is given, Jest will try to\n' +
  `traverse directory tree up, until it finds either "${JEST_CONFIG}" or\n` +
  `"${PACKAGE_JSON}".`;
