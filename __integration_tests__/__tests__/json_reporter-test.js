'use strict';

jest.unmock('../runJest');

const runJest = require('../runJest');

describe('coverage_report', () => {
  it('outputs coverage report', () => {
    const result = runJest('json_reporter', ['--json']);
    const stdout = result.stdout.toString();
    const stderr = result.stderr.toString();
    let jsonResult;

    expect(stderr).toMatch(/1 test failed, 1 test passed/);
    expect(result.status).toBe(1);

    try {
      jsonResult = JSON.parse(stdout);
    } catch (err) {
      throw new Error(
        'Can\'t parse the JSON result from stdout' + err.toString()
      );
    }

    expect(jsonResult.numTotalTests).toBe(2);
    expect(jsonResult.numTotalTestSuites).toBe(1);
    expect(jsonResult.numRuntimeErrorTestSuites).toBe(0);
    expect(jsonResult.numPassedTests).toBe(1);
    expect(jsonResult.numFailedTests).toBe(1);
    expect(jsonResult.numPendingTests).toBe(0);
  });
});
