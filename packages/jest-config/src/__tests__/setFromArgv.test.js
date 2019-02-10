/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import setFromArgv from '../setFromArgv';

test('maps special values to valid options', () => {
  const options = {};
  const argv = {
    coverage: true,
    env: 'node',
    json: true,
    watchAll: true,
  };

  expect(setFromArgv(options, argv)).toMatchObject({
    collectCoverage: true,
    testEnvironment: 'node',
    useStderr: true,
    watch: false,
    watchAll: true,
  });
});

test('maps regular values to themselves', () => {
  const options = {};
  const argv = {
    collectCoverageOnlyFrom: ['a', 'b'],
    coverageDirectory: 'covDir',
    watchman: true,
  };

  expect(setFromArgv(options, argv)).toMatchObject({
    collectCoverageOnlyFrom: ['a', 'b'],
    coverageDirectory: 'covDir',
    watchman: true,
  });
});

test('works with string objects', () => {
  const options = {};
  const argv = {
    moduleNameMapper: '{"types/(.*)": "<rootDir>/src/types/$1"}',
    transform: '{"*.js": "<rootDir>/transformer"}',
  };
  expect(setFromArgv(options, argv)).toMatchObject({
    moduleNameMapper: {
      'types/(.*)': '<rootDir>/src/types/$1',
    },
    transform: {
      '*.js': '<rootDir>/transformer',
    },
  });
});

test('explicit flags override those from --config', () => {
  const options = {};
  const argv = {
    config: '{"watch": false}',
    watch: true,
  };
  expect(setFromArgv(options, argv)).toMatchObject({watch: true});
});
