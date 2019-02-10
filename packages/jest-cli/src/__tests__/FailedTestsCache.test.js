// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

import FailedTestsCache from '../FailedTestsCache';

describe('FailedTestsCache', () => {
  test('should filter tests', () => {
    const failedTestsCache = new FailedTestsCache();
    failedTestsCache.setTestResults([
      {
        numFailingTests: 0,
        testFilePath: '/path/to/passing.js',
        testResults: [
          {fullName: 'test 1', status: 'passed'},
          {fullName: 'test 2', status: 'passed'},
        ],
      },
      {
        numFailingTests: 2,
        testFilePath: '/path/to/failed_1.js',
        testResults: [
          {fullName: 'test 3', status: 'failed'},
          {fullName: 'test 4', status: 'failed'},
        ],
      },
      {
        numFailingTests: 1,
        testFilePath: '/path/to/failed_2.js',
        testResults: [
          {fullName: 'test 5', status: 'failed'},
          {fullName: 'test 6', status: 'passed'},
        ],
      },
    ]);

    const result = failedTestsCache.filterTests([
      {
        path: '/path/to/passing.js',
      },
      {
        path: '/path/to/failed_1.js',
      },
      {
        path: '/path/to/failed_2.js',
      },
      {
        path: '/path/to/unknown.js',
      },
    ]);
    expect(result).toMatchObject([
      {
        path: '/path/to/failed_1.js',
      },
      {
        path: '/path/to/failed_2.js',
      },
    ]);
    expect(failedTestsCache.updateConfig({})).toMatchObject({
      enabledTestsMap: {
        '/path/to/failed_1.js': {'test 3': true, 'test 4': true},
        '/path/to/failed_2.js': {'test 5': true},
      },
    });
  });
});
