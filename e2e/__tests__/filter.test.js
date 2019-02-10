/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

describe('Dynamic test filtering', () => {
  it('uses the default JSON option', () => {
    const result = runJest('filter', []);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('1 total');
  });

  it('uses the CLI option', () => {
    const result = runJest('filter', [
      '--filter=<rootDir>/my-secondary-filter.js',
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('1 total');
  });

  it('ingores the filter if requested to do so', () => {
    const result = runJest('filter', [
      '--filter=<rootDir>/my-secondary-filter.js',
      '--skipFilter',
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('2 total');
  });

  it('throws when you return clowny stuff', () => {
    const result = runJest('filter', [
      '--filter=<rootDir>/my-clowny-filter.js',
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('did not return a valid test list');
    expect(result.stderr).toContain('my-clowny-filter');
  });
});
