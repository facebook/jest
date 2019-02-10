/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import logDebugMessages from '../log_debug_messages';

jest.mock('../../../package.json', () => ({version: 123}));

jest.mock('myRunner', () => ({name: 'My Runner'}), {virtual: true});

const getOutputStream = () => ({
  write(message) {
    expect(message).toMatchSnapshot();
  },
});

it('prints the jest version', () => {
  expect.assertions(1);
  logDebugMessages({watch: true}, {testRunner: 'myRunner'}, getOutputStream());
});

it('prints the test framework name', () => {
  expect.assertions(1);
  logDebugMessages({watch: true}, {testRunner: 'myRunner'}, getOutputStream());
});

it('prints the config object', () => {
  expect.assertions(1);
  const globalConfig = {
    automock: false,
    watch: true,
  };
  const config = {
    rootDir: '/path/to/dir',
    roots: ['path/to/dir/test'],
    testRunner: 'myRunner',
  };
  logDebugMessages(globalConfig, config, getOutputStream());
});
