/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import runJest, {json as runWithJson} from '../runJest';

describe('async jasmine', () => {
  it('works with beforeAll', () => {
    const {json} = runWithJson('jasmine-async', ['promiseBeforeAll.test.js']);

    expect(json.numTotalTests).toBe(4);
    expect(json.numPassedTests).toBe(1);
    expect(json.numFailedTests).toBe(3);
    expect(json.numPendingTests).toBe(0);

    const {message} = json.testResults[0];
    expect(message).toMatch('with failing async');
    expect(message).toMatch('timeout');
    expect(message).toMatch('done - with error thrown');
    expect(message).toMatch('done - with error called back');
  });

  it('works with beforeEach', () => {
    const {json} = runWithJson('jasmine-async', ['promiseBeforeEach.test.js']);

    expect(json.numTotalTests).toBe(3);
    expect(json.numPassedTests).toBe(1);
    expect(json.numFailedTests).toBe(2);
    expect(json.numPendingTests).toBe(0);

    const {message} = json.testResults[0];
    expect(message).toMatch('done - with error thrown');
    expect(message).toMatch('done - with error called back');
  });

  it('works with afterAll', () => {
    const result = runWithJson('jasmine-async', ['promiseAfterAll.test.js']);
    const {json} = result;

    expect(json.numTotalTests).toBe(2);
    expect(json.numPassedTests).toBe(2);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(0);
    expect(json.testResults[0].message).toBe('');

    expect((result.stderr.match(/unset flag/g) || []).length).toBe(1);
  });

  it('works with afterEach', () => {
    const {json} = runWithJson('jasmine-async', ['promiseAfterEach.test.js']);

    expect(json.numTotalTests).toBe(2);
    expect(json.numPassedTests).toBe(2);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(0);
    expect(json.testResults[0].message).toBe('');
  });

  it('works with fit', () => {
    const {json} = runWithJson('jasmine-async', ['promiseFit.test.js']);

    expect(json.numTotalTests).toBe(3);
    expect(json.numPassedTests).toBe(1);
    expect(json.numFailedTests).toBe(1);
    expect(json.numPendingTests).toBe(1);
    expect(json.testResults[0].message).toMatch(/will run and fail/);
  });

  it('works with xit', () => {
    const {json} = runWithJson('jasmine-async', ['promiseXit.test.js']);

    expect(json.numTotalTests).toBe(2);
    expect(json.numPassedTests).toBe(1);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(1);
  });

  it('throws when not a promise is returned', () => {
    const {json} = runWithJson('jasmine-async', ['returningValues.test.js']);

    expect(json.numTotalTests).toBe(11);
    expect(json.numPassedTests).toBe(0);
    expect(json.numFailedTests).toBe(11);
    expect(json.numPendingTests).toBe(0);
  });

  it('tests async promise code', () => {
    const {json} = runWithJson('jasmine-async', ['promiseIt.test.js']);
    const message = json.testResults[0].message;

    expect(json.numTotalTests).toBe(16);
    expect(json.numPassedTests).toBe(6);
    expect(json.numFailedTests).toBe(7);
    expect(json.numPendingTests).toBe(3);

    expect(message).toMatch('fails if promise is rejected');
    expect(message).toMatch('works with done.fail');
    expect(message).toMatch('works with done(error)');
    expect(message).toMatch('fails if failed expectation with done');
    expect(message).toMatch('fails if failed expectation with done - async');
    expect(message).toMatch('fails a sync test');
    expect(message).toMatch('fails if a custom timeout is exceeded');
  });

  it('works with concurrent', () => {
    const {json} = runWithJson('jasmine-async', ['concurrent.test.js']);
    expect(json.numTotalTests).toBe(4);
    expect(json.numPassedTests).toBe(2);
    expect(json.numFailedTests).toBe(1);
    expect(json.numPendingTests).toBe(1);
    expect(json.testResults[0].message).toMatch(/concurrent test fails/);
  });

  it('works with concurrent within a describe block when invoked with testNamePattern', () => {
    const {json} = runWithJson('jasmine-async', [
      '--testNamePattern',
      'one concurrent test fails',
      'concurrentWithinDescribe.test.js',
    ]);
    expect(json.numTotalTests).toBe(2);
    expect(json.numPassedTests).toBe(0);
    expect(json.numFailedTests).toBe(1);
    expect(json.numPendingTests).toBe(1);
    expect(json.testResults[0].message).toMatch(/concurrent test fails/);
  });

  it('works with concurrent.each', () => {
    const {json} = runWithJson('jasmine-async', ['concurrent-each.test.js']);
    expect(json.numTotalTests).toBe(4);
    expect(json.numPassedTests).toBe(2);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(2);
  });

  it('works with concurrent.only.each', () => {
    const {json} = runWithJson('jasmine-async', [
      'concurrent-only-each.test.js',
    ]);
    expect(json.numTotalTests).toBe(4);
    expect(json.numPassedTests).toBe(2);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(2);
  });

  it("doesn't execute more than 5 tests simultaneously", () => {
    const {json} = runWithJson('jasmine-async', ['concurrent-many.test.js']);
    expect(json.numTotalTests).toBe(10);
    expect(json.numPassedTests).toBe(10);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(0);
  });

  it('async test fails', () => {
    const result = runWithJson('jasmine-async', ['asyncTestFails.test.js']);

    expect(result.exitCode).toBe(1);
    expect(result.json.testResults[0].message).toEqual(
      expect.stringContaining('Received:'),
    );
  });

  it('generator test', () => {
    const result = runJest('jasmine-async', ['generator.test.js']);

    expect(result.exitCode).toBe(0);
  });
});
