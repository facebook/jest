/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

'use strict';

import type {Config} from 'types/Config';

const loadFromFile = require('./loadFromFile');
const loadFromPackage = require('./loadFromPackage');
const normalize = require('./normalize');
const path = require('path');
const setFromArgv = require('./setFromArgv');

function readConfig(argv: Object, packageRoot: string) {
  return readRawConfig(argv, packageRoot)
    .then(config => Object.freeze(setFromArgv(config, argv)));
}

function readRawConfig(argv: Object, root: string): Promise<any> {
  if (typeof argv.config === 'string') {
    return loadFromFile(path.resolve(process.cwd(), argv.config));
  }

  if (typeof argv.config === 'object') {
    const config: Config = Object.assign({}, argv.config);
    config.rootDir = config.rootDir || root;

    return Promise.resolve(normalize(config, argv));
  }

  return loadFromPackage(path.join(root, 'package.json'), argv)
    .then(config => config || normalize({rootDir: root}, argv));
}

module.exports = readConfig;
