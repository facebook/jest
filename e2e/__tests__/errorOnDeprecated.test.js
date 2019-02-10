/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';
import {extractSummary} from '../Utils';
import {skipSuiteOnJestCircus} from '../../scripts/ConditionalTest';
import {wrap} from 'jest-snapshot-serializer-raw';

skipSuiteOnJestCircus();

const testFiles = [
  'fail.test.js',
  'jasmine.addMatchers.test.js',
  'jasmine.any.test.js',
  'jasmine.anything.test.js',
  'jasmine.arrayContaining.test.js',
  'jasmine.createSpy.test.js',
  'jasmine.objectContaining.test.js',
  'jasmine.stringMatching.test.js',
  'pending.test.js',
  'spyOn.test.js',
  'spyOnProperty.test.js',
  'defaultTimeoutInterval.test.js',
];

const SHOULD_NOT_PASS_IN_JEST = new Set([
  'fail.test.js',
  'spyOnProperty.test.js',
]);

testFiles.forEach(testFile => {
  test(`${testFile} errors in errorOnDeprecated mode`, () => {
    const result = runJest('error-on-deprecated', [
      testFile,
      '--errorOnDeprecated',
    ]);
    expect(result.status).toBe(1);
    const {rest} = extractSummary(result.stderr);
    expect(wrap(rest)).toMatchSnapshot();
  });
});

testFiles.forEach(testFile => {
  const shouldPass = SHOULD_NOT_PASS_IN_JEST.has(testFile);

  const expectation = `${testFile} ${shouldPass ? 'errors' : 'passes'}`;
  const testName = `${expectation} when not in errorOnDeprecated mode`;

  test(testName, () => {
    const result = runJest('error-on-deprecated', [testFile]);
    expect(result.status).toBe(shouldPass ? 1 : 0);
  });
});
