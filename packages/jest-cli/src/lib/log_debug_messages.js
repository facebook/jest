/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig, ProjectConfig} from 'types/Config';

import {version as VERSION} from '../../package.json';

export default function logDebugMessages(
  globalConfig: GlobalConfig,
  configs: Array<ProjectConfig>,
  outputStream: stream$Writable | tty$WriteStream,
): void {
  const output = {
    configs,
    globalConfig,
    version: VERSION,
  };
  outputStream.write(JSON.stringify(output, null, '  ') + '\n');
}
