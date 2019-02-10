/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';

const MOCKS_PATTERN = path.sep + '__mocks__' + path.sep;

const getMockName = (filePath: string) => {
  const mockPath = filePath.split(MOCKS_PATTERN)[1];
  return mockPath
    .substring(0, mockPath.lastIndexOf(path.extname(mockPath)))
    .replace(/\\/g, '/');
};

export default getMockName;
