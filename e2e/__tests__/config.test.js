/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

test('config as JSON', () => {
  const result = runJest('verbose-reporter', [
    '--config=' +
      JSON.stringify({
        testEnvironment: 'node',
        testMatch: ['banana strawberry kiwi'],
      }),
  ]);

  expect(result.status).toBe(1);
  expect(result.stdout).toMatch('No tests found');
});

test('works with sane config JSON', () => {
  const result = runJest('verbose-reporter', [
    '--config=' +
      JSON.stringify({
        testEnvironment: 'node',
      }),
  ]);

  expect(result.status).toBe(1);
  expect(result.stderr).toMatch('works just fine');
});

test('watchman config option is respected over default argv', () => {
  const {stdout} = runJest('verbose-reporter', [
    '--env=node',
    '--watchman=false',
    '--debug',
  ]);

  expect(stdout).toMatch('"watchman": false');
});

test('config from argv is respected with sane config JSON', () => {
  const {stdout} = runJest('verbose-reporter', [
    '--config=' +
      JSON.stringify({
        testEnvironment: 'node',
        watchman: false,
      }),
    '--debug',
  ]);

  expect(stdout).toMatch('"watchman": false');
});

test('works with jsdom testEnvironmentOptions config JSON', () => {
  const result = runJest('environmentOptions', [
    '--config=' +
      JSON.stringify({
        testEnvironmentOptions: {
          userAgent: 'Agent/007',
        },
      }),
  ]);

  expect(result.status).toBe(0);
  expect(result.stderr).toMatch('found userAgent Agent/007');
});
