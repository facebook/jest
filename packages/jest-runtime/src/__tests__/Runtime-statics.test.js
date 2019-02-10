/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import HasteMap from 'jest-haste-map';
const Runtime = require('../');

jest.mock('jest-haste-map');

describe('Runtime statics', () => {
  const projectConfig = {
    cacheDirectory: '/tmp',
    haste: {},
    modulePathIgnorePatterns: ['/root/ignore-1', '/root/ignore-2'],
    watchPathIgnorePatterns: ['/watch-root/ignore-1'],
  };
  const options = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Runtime.createHasteMap passes correct ignore files to HasteMap', () => {
    Runtime.createHasteMap(projectConfig, options);
    expect(HasteMap).toBeCalledWith(
      expect.objectContaining({
        ignorePattern: /\/root\/ignore-1|\/root\/ignore-2/,
      }),
    );
  });

  test('Runtime.createHasteMap passes correct ignore files to HasteMap in watch mode', () => {
    Runtime.createHasteMap(projectConfig, {...options, watch: true});
    expect(HasteMap).toBeCalledWith(
      expect.objectContaining({
        ignorePattern: /\/root\/ignore-1|\/root\/ignore-2|\/watch-root\/ignore-1/,
        watch: true,
      }),
    );
  });
});
