/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
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
import {PACKAGE_JSON} from './constants';

// Read the configuration and set its `rootDir`
// 1. If it's a `package.json` file, we look into its "jest" property
// 2. For any other file, we just require it.
export default (configPath: Path): InitialOptions => {
  const isJSON = configPath.endsWith('.json');
  let configObject;

  try {
    // $FlowFixMe dynamic require
    configObject = require(configPath);
  } catch (error) {
    if (isJSON) {
      throw new Error(
        `Jest: Failed to parse config file ${configPath}\n` +
          `  ${jsonlint.errors(fs.readFileSync(configPath, 'utf8'))}`,
      );
    } else {
      throw error;
    }
  }

  if (configPath.endsWith(PACKAGE_JSON)) {
    // Event if there's no "jest" property in package.json we will still use
    // an empty object.
    configObject = configObject.jest || {};
  }

  if (configObject.rootDir) {
    // We don't touch it if it has an absolute path specified
    if (!path.isAbsolute(configObject.rootDir)) {
      // otherwise, we'll resolve it relative to the file's __dirname
      configObject.rootDir = path.resolve(
        path.dirname(configPath),
        configObject.rootDir,
      );
    }
  } else {
    // If rootDir is not there, we'll set it to this file's __dirname
    configObject.rootDir = path.dirname(configPath);
  }

  return configObject;
};
