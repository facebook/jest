/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {InitialOptions, Path} from 'types/Config';

import path from 'path';
import fs from 'fs';
import jsonlint from './vendor/jsonlint';
import {JEST_CONFIG, PACKAGE_JSON} from './constants';

type ConfigReadResult = {
  configDir: ?string,
  configFile: string,
  rawOptions: ?Object,
};

function tryJestConfig(files: string[], configDir, configFile): ?ConfigReadResult {
  files.push(configFile);

  try {
    return {
      configDir,
      configFile,
      rawOptions: require(configFile),
    };
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err;
    }
  }

  return {
    configDir,
    configFile,
  };
}

function tryJson(files: string[], configDir:string,  configFile: string): ?ConfigReadResult {
  files.push(configFile);
  let content;

  try {
    content = fs.readFileSync(configFile, 'utf8');
    const rawOptions = JSON.parse(content);
    if (rawOptions) {
      return {
        configDir,
        configFile,
        rawOptions,
      };
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      try {
        jsonlint.parse(content)
      } catch (jsonlintError) {
        throw new Error(
          `Jest: Failed to parse ${path.relative(configDir, configFile)}:\n  ${jsonlintError.message}`,
        );
      }
      throw err;
    }

    if (err.code !== 'ENOENT' && err.code !== 'EISDIR') {
      throw err;
    }

  }

  return {
    configDir,
    configFile,
  };
}

function tryPackageJson(
  files: string[],
  configDir: string,
  configFile: ?string,
): ConfigReadResult {
  files.push(configFile);
  const jsonResult = tryJson(files, configDir, configFile);

  if (jsonResult.rawOptions && jsonResult.rawOptions.jest) {
    return {
      configDir,
      configFile,
      rawOptions: jsonResult.rawOptions.jest,
    };
  }

  return {
    configDir,
    configFile,
  };
}

function tryInitialRequest(files: string[], cwd: Path, configFile: string) {
  files.push(configFile);

  const configResult = tryJestConfig(files, cwd, configFile);
  if (configResult.rawOptions) {
    return configResult;
  }

  if (configFile.endsWith(PACKAGE_JSON)) {
    const packageJsonResult = tryPackageJson(files, cwd, configFile);
    if (packageJsonResult.rawOptions) {
      return packageJsonResult;
    }
  } else if (configFile.endsWith('.json')) {
    const jsonResult = tryJson(files, cwd, configFile);
    if (jsonResult.rawOptions) {
      return jsonResult;
    }
  }

  return null;
}

function readConfigUp(files: string[], cwd: Path): ?ConfigReadResult {
  let dir = cwd;

  do {
    const configResult = tryJestConfig(files, dir, path.resolve(dir, JEST_CONFIG));
    if (configResult.rawOptions) {
      return configResult;
    }

    const packageJsonResult = tryPackageJson(files, dir, path.resolve(dir, PACKAGE_JSON));
    if (packageJsonResult.rawOptions) {
      return packageJsonResult;
    }
  } while (dir !== (dir = path.dirname(dir)))

  return null;
}

// Read the configuration and set its `rootDir`
// 1. If it's a `package.json` file, we look into its "jest" property
// 2. For any other file, we just require it.
export default (cwd: Path, pathToResolve: string): InitialOptions => {
  if (!path.isAbsolute(cwd)) {
    throw new Error(`"cwd" must be an absolute path. cwd: ${cwd}`);
  }

  const files = [];
  const result =
    tryInitialRequest(
      files,
      cwd,
      path.resolve(cwd, pathToResolve),
    )
    || readConfigUp(files, cwd);

  if (result && result.rawOptions) {
    if (result.rawOptions.rootDir && !path.isAbsolute(result.rawOptions.rootDir)) {
      // We don't touch it if it has an absolute path specified
      // otherwise, we'll resolve it relative to the file's __dirname
      result.rawOptions.rootDir = path.resolve(
        result.configDir,
        result.rawOptions.rootDir,
      );
    } else {
      // If rootDir is not there, we'll set it to this file's __dirname
      result.rawOptions.rootDir = result.configDir;
    }
    return result;
  }

  throw new Error(
    `Could not find jest config:\n` +
      files.map(file => path.relative(cwd, file)).join('\n'),
  );
};
