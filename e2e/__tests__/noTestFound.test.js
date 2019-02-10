/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

describe('Coverage Report', () => {
  it('outputs coverage report', () => {
    const {stdout} = runJest('coverage-report', ['not-a-valid-test']);

    expect(stdout).toMatch('No tests found');

    expect(stdout).not.toMatch('0 tests passed');
  });
});

describe('File path not found in mulit-project scenario', () => {
  it('outputs coverage report', () => {
    const {stdout} = runJest('multi-project-config-root', [
      '--runTestsByPath',
      'not-a-valid-test',
    ]);

    expect(stdout).toMatch('No tests found');
    expect(stdout).toMatch(/0 files checked across 2 projects\./);
  });
});
