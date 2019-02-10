// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

import {readConfigs} from '../index';

test('readConfigs() throws when called without project paths', () => {
  expect(() => {
    readConfigs(null /* argv */, [] /* projectPaths */);
  }).toThrowError('jest: No configuration found for any project.');
});
