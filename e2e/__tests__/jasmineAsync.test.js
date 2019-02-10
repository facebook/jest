/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest, {json as runWithJson} from '../runJest';

describe('async jasmine', () => {
  it('works with beforeAll', () => {
    const result = runWithJson('jasmine-async', ['promiseBeforeAll.test.js']);
    const json = result.json;

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
    const result = runWithJson('jasmine-async', ['promiseBeforeEach.test.js']);
    const json = result.json;

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
    const json = result.json;

    expect(json.numTotalTests).toBe(2);
    expect(json.numPassedTests).toBe(2);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(0);
    expect(json.testResults[0].message).toBe('');

    expect((result.stderr.match(/unset flag/g) || []).length).toBe(1);
  });

  it('works with afterEach', () => {
    const result = runWithJson('jasmine-async', ['promiseAfterEach.test.js']);
    const json = result.json;

    expect(json.numTotalTests).toBe(2);
    expect(json.numPassedTests).toBe(2);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(0);
    expect(json.testResults[0].message).toBe('');
  });

  it('works with fit', () => {
    const result = runWithJson('jasmine-async', ['promiseFit.test.js']);
    const json = result.json;

    expect(json.numTotalTests).toBe(3);
    expect(json.numPassedTests).toBe(1);
    expect(json.numFailedTests).toBe(1);
    expect(json.numPendingTests).toBe(1);
    expect(json.testResults[0].message).toMatch(/will run and fail/);
  });

  it('works with xit', () => {
    const result = runWithJson('jasmine-async', ['promiseXit.test.js']);
    const json = result.json;

    expect(json.numTotalTests).toBe(2);
    expect(json.numPassedTests).toBe(1);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(1);
  });

  it('throws when not a promise is returned', () => {
    const result = runWithJson('jasmine-async', ['returningValues.test.js']);
    const json = result.json;

    expect(json.numTotalTests).toBe(11);
    expect(json.numPassedTests).toBe(0);
    expect(json.numFailedTests).toBe(11);
    expect(json.numPendingTests).toBe(0);
  });

  it('tests async promise code', () => {
    const result = runWithJson('jasmine-async', ['promiseIt.test.js']);
    const json = result.json;
    const message = json.testResults[0].message;

    expect(json.numTotalTests).toBe(16);
    expect(json.numPassedTests).toBe(6);
    expect(json.numFailedTests).toBe(9);

    expect(message).toMatch('fails if promise is rejected');
    expect(message).toMatch('works with done.fail');
    expect(message).toMatch('works with done(error)');
    expect(message).toMatch('fails if failed expectation with done');
    expect(message).toMatch('fails if failed expectation with done - async');
    expect(message).toMatch('fails with thrown error with done - sync');
    expect(message).toMatch('fails with thrown error with done - async');
    expect(message).toMatch('fails a sync test');
    expect(message).toMatch('fails if a custom timeout is exceeded');
  });

  it('works with concurrent', () => {
    const result = runWithJson('jasmine-async', ['concurrent.test.js']);
    const json = result.json;
    expect(json.numTotalTests).toBe(4);
    expect(json.numPassedTests).toBe(2);
    expect(json.numFailedTests).toBe(1);
    expect(json.numPendingTests).toBe(1);
    expect(json.testResults[0].message).toMatch(/concurrent test fails/);
  });

  it("doesn't execute more than 5 tests simultaneously", () => {
    const result = runWithJson('jasmine-async', ['concurrent-many.test.js']);
    const json = result.json;
    expect(json.numTotalTests).toBe(10);
    expect(json.numPassedTests).toBe(10);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(0);
  });

  it('async test fails', () => {
    const result = runWithJson('jasmine-async', ['asyncTestFails.test.js']);

    expect(result.status).toBe(1);
    expect(result.json.testResults[0].message).toEqual(
      expect.stringContaining('Received:'),
    );
  });

  it('generator test', () => {
    const result = runJest('jasmine-async', ['generator.test.js']);

    expect(result.status).toBe(0);
  });
});
