/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {JEST_CONFIG} from '../constants';
import {readConfig} from '../index';

jest.mock('../resolveConfigPath', () => {
  const {JEST_CONFIG} = jest.requireActual('../constants');
  return {
    ...jest.genMockFromModule('../resolveConfigPath'),
    default: () => JEST_CONFIG,
  };
});

jest.mock('../readConfigFileAndSetRootDir', () => ({
  ...jest.genMockFromModule('../readConfigFileAndSetRootDir'),
  default: () => ({
    rootDir: '',
  }),
}));

test('readConfig() throws when an object is passed without a file path', () => {
  expect(() => {
    readConfig(
      // @ts-ignore
      null /* argv */,
      // @ts-ignore
      {} /* packageRootOrConfig */,
      false /* skipArgvConfigOption */,
      null /* parentConfigPath */,
    );
  }).toThrowError(
    'Jest: Cannot use configuration as an object without a file path',
  );
});

describe('When called from readConfigs()', () => {
  test('readConfig() does not use config path from parent', () => {
    const projectConfig: any = readConfig(
      // @ts-ignore
      {config: 'parent.config.js', rootDir: ''} /* argv */,
      '<rootDir>/A' /* packageRootOrConfig */,
      true /* skipArgvConfigOption */,
      null /* parentConfigPath */,
    );

    expect(projectConfig.configPath).toBe(JEST_CONFIG);
  });

  test('readConfig() does not use JSON config from parent', () => {
    const JSONConfig = JSON.stringify({
      projects: ['<rootDir>/A', '<rootDir>/B'],
    });

    const projectConfig: any = readConfig(
      // @ts-ignore
      {config: JSONConfig, rootDir: ''} /* argv */,
      '<rootDir>/A' /* packageRootOrConfig */,
      true /* skipArgvConfigOption */,
      null /* parentConfigPath */,
    );

    expect(projectConfig.projects).not.toBeDefined();
  });
});
