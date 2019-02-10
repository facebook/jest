/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

const getLog = result => result.stdout.split('\n')[1].trim();

describe('Environment override', () => {
  it('uses jsdom when specified', () => {
    const result = runJest('env-test', ['--env=jsdom', 'env.test.js']);
    expect(result.status).toBe(0);
    expect(getLog(result)).toBe('WINDOW');
  });

  it('uses node as default from package.json', () => {
    const result = runJest('env-test', ['env.test.js']);
    expect(result.status).toBe(0);
    expect(getLog(result)).toBe('NO WINDOW');
  });

  it('uses node when specified', () => {
    const result = runJest('env-test', ['--env=node', 'env.test.js']);
    expect(result.status).toBe(0);
    expect(getLog(result)).toBe('NO WINDOW');
  });

  it('fails when the env is not available', () => {
    const result = runJest('env-test', ['--env=banana', 'env.test.js']);
    expect(result.status).toBe(1);
  });
});

describe('Environment equivalent', () => {
  it('uses jsdom', () => {
    const result = runJest('env-test', ['--env=jsdom', 'equivalent.test.js']);
    expect(result.status).toBe(0);
  });

  it('uses node', () => {
    const result = runJest('env-test', ['--env=node', 'equivalent.test.js']);
    expect(result.status).toBe(0);
  });
});
