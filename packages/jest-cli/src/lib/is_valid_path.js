/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig} from 'types/Config';
import {isSnapshotPath} from 'jest-snapshot';

export default function isValidPath(
  globalConfig: GlobalConfig,
  filePath: string,
) {
  return (
    !filePath.includes(globalConfig.coverageDirectory) &&
    !isSnapshotPath(filePath)
  );
}
