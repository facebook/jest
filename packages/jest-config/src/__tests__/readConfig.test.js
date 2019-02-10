// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

import {readConfig} from '../index';

test('readConfig() throws when an object is passed without a file path', () => {
  expect(() => {
    readConfig(
      null /* argv */,
      {} /* packageRootOrConfig */,
      false /* skipArgvConfigOption */,
      null /* parentConfigPath */,
    );
  }).toThrowError(
    'Jest: Cannot use configuration as an object without a file path',
  );
});
