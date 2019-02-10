/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import fs from 'fs';
import path from 'path';
import runJest from '../runJest';

describe('JSON Reporter', () => {
  const outputFileName = 'sum.result.json';
  const outputFilePath = path.join(
    process.cwd(),
    'e2e/json-reporter/',
    outputFileName,
  );

  afterAll(() => {
    fs.unlinkSync(outputFilePath);
  });

  it('writes test result to sum.result.json', () => {
    let jsonResult;

    runJest('json-reporter', ['--json', `--outputFile=${outputFileName}`]);
    const testOutput = fs.readFileSync(outputFilePath, 'utf8');

    try {
      jsonResult = JSON.parse(testOutput);
    } catch (err) {
      throw new Error(
        `Can't parse the JSON result from ${outputFileName}, ${err.toString()}`,
      );
    }

    expect(jsonResult.numTotalTests).toBe(3);
    expect(jsonResult.numTotalTestSuites).toBe(1);
    expect(jsonResult.numRuntimeErrorTestSuites).toBe(0);
    expect(jsonResult.numPassedTests).toBe(2);
    expect(jsonResult.numFailedTests).toBe(1);
    expect(jsonResult.numPendingTests).toBe(0);

    const noAncestors = jsonResult.testResults[0].assertionResults.find(
      item => item.title == 'no ancestors',
    );
    let expected = {ancestorTitles: []};
    expect(noAncestors).toEqual(expect.objectContaining(expected));

    const addsNumbers = jsonResult.testResults[0].assertionResults.find(
      item => item.title == 'adds numbers',
    );
    expected = {ancestorTitles: ['sum']};
    expect(addsNumbers).toEqual(expect.objectContaining(expected));

    const failsTheTest = jsonResult.testResults[0].assertionResults.find(
      item => item.title == 'fails the test',
    );
    expected = {ancestorTitles: ['sum', 'failing tests']};
    expect(failsTheTest).toEqual(expect.objectContaining(expected));
  });

  it('outputs coverage report', () => {
    const result = runJest('json-reporter', ['--json']);
    let jsonResult;

    expect(result.stderr).toMatch(/1 failed, 2 passed/);
    expect(result.status).toBe(1);

    try {
      jsonResult = JSON.parse(result.stdout);
    } catch (err) {
      throw new Error(
        "Can't parse the JSON result from stdout" + err.toString(),
      );
    }

    expect(jsonResult.numTotalTests).toBe(3);
    expect(jsonResult.numTotalTestSuites).toBe(1);
    expect(jsonResult.numRuntimeErrorTestSuites).toBe(0);
    expect(jsonResult.numPassedTests).toBe(2);
    expect(jsonResult.numFailedTests).toBe(1);
    expect(jsonResult.numPendingTests).toBe(0);

    const noAncestors = jsonResult.testResults[0].assertionResults.find(
      item => item.title == 'no ancestors',
    );
    let expected = {ancestorTitles: []};
    expect(noAncestors).toEqual(expect.objectContaining(expected));

    const addsNumbers = jsonResult.testResults[0].assertionResults.find(
      item => item.title == 'adds numbers',
    );
    expected = {ancestorTitles: ['sum']};
    expect(addsNumbers).toEqual(expect.objectContaining(expected));

    const failsTheTest = jsonResult.testResults[0].assertionResults.find(
      item => item.title == 'fails the test',
    );
    expected = {ancestorTitles: ['sum', 'failing tests']};
    expect(failsTheTest).toEqual(expect.objectContaining(expected));
  });
});
