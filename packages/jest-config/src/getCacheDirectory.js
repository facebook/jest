/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const path = require('path');
const os = require('os');

import {sync as realpath} from 'realpath-native';

const getCacheDirectory = () => {
  const {getuid} = process;
  const tmpdir = path.join(realpath(os.tmpdir()), 'jest');
  if (getuid == null) {
    return tmpdir;
  } else {
    // On some platforms tmpdir() is `/tmp`, causing conflicts between different
    // users and permission issues. Adding an additional subdivision by UID can
    // help.
    return `${tmpdir}_${getuid.call(process).toString(36)}`;
  }
};

export default getCacheDirectory;
