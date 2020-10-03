/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';

const MOCKS_PATTERN = path.sep + '__mocks__' + path.sep;

const getMockName = (filePath: string): string => {
  const mockPath = filePath.split(MOCKS_PATTERN)[1];
  const mockName = mockPath
    .substring(0, mockPath.lastIndexOf(path.extname(mockPath)))
    .replace(/\\/g, '/');

  if (mockName.slice(-5) === '.mock') return mockName.slice(0, -5);
  else return mockName;
};

export default getMockName;
