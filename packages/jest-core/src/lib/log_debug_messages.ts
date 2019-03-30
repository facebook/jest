/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config} from '@jest/types';

const VERSION = require('../../package.json').version;

export default function logDebugMessages(
  globalConfig: Config.GlobalConfig,
  configs: Array<Config.ProjectConfig> | Config.ProjectConfig,
  outputStream: NodeJS.WriteStream,
): void {
  const output = {
    configs,
    globalConfig,
    version: VERSION,
  };

  // Write to single line if using JSON lines format. Otherwise, pretty print.
  outputStream.write(
    JSON.stringify(output, null, !globalConfig.jsonLines ? '  ' : '') + '\n',
  );
}
