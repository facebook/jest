/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import semver = require('semver');
import {skipSuiteOnJasmine} from '@jest/test-utils';
import {extractSummary} from '../Utils';
import runJest from '../runJest';

skipSuiteOnJasmine();

function givenNode(versionRange: string, func: () => void): void {
  if (semver.satisfies(process.versions.node, versionRange)) {
    func();
  }
}

it('passes generally', () => {
  const result = runJest('deadlines', ['manual-within.js']);
  expect(result.exitCode).toBe(0);
  const summary = summaryWithoutTime(result);
  expect(summary).toMatchSnapshot();
});

it('throws on deadline exceeded', () => {
  const result = runJest('deadlines', ['manual-exceeded.js']);
  expect(result.exitCode).toBe(1);
  const summary = summaryWithoutTime(result);
  givenNode('>=12', () =>
    expect(summary).toMatchInlineSnapshot(`
Object {
  "rest": "FAIL __tests__/manual-exceeded.js
  describe
    ✕ it

  ● describe › it

    deadline exceeded (waited here for <<REPLACED>>)

      12 | describe('describe', () => {
      13 |   it('it', async () => {
    > 14 |     await expect.withinDeadline(sleep(200));
         |     ^
      15 |   }, 50);
      16 | });
      17 | 

      at Object.<anonymous> (__tests__/manual-exceeded.js:14:5)",
  "summary": "Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   0 total
Time:        <<REPLACED>>
Ran all test suites matching /manual-exceeded.js/i.",
}
`),
  );
  givenNode('<12', () =>
    expect(summary).toMatchInlineSnapshot(`
      Object {
        "rest": "FAIL __tests__/manual-exceeded.js
        describe
          ✕ it

        ● describe › it

          deadline exceeded (waited here for <<REPLACED>>)",
        "summary": "Test Suites: 1 failed, 1 total
      Tests:       1 failed, 1 total
      Snapshots:   0 total
      Time:        <<REPLACED>>
      Ran all test suites matching /manual-exceeded.js/i.",
      }
    `),
  );
});

it('throws on deadline exceeded in a hook', () => {
  const result = runJest('deadlines', ['manual-exceeded-hook.js']);
  expect(result.exitCode).toBe(1);
  const summary = summaryWithoutTime(result);
  givenNode('>=12', () =>
    expect(summary).toMatchInlineSnapshot(`
Object {
  "rest": "FAIL __tests__/manual-exceeded-hook.js
  describe
    ✕ does nothing

  ● describe › does nothing

    deadline exceeded (waited here for <<REPLACED>>)

      12 | describe('describe', () => {
      13 |   beforeEach(async () => {
    > 14 |     await expect.withinDeadline(sleep(200));
         |     ^
      15 |   }, 50);
      16 | 
      17 |   it('does nothing', () => {});

      at Object.<anonymous> (__tests__/manual-exceeded-hook.js:14:5)",
  "summary": "Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   0 total
Time:        <<REPLACED>>
Ran all test suites matching /manual-exceeded-hook.js/i.",
}
`),
  );
  givenNode('<12', () =>
    expect(summary).toMatchInlineSnapshot(`
      Object {
        "rest": "FAIL __tests__/manual-exceeded-hook.js
        describe
          ✕ does nothing

        ● describe › does nothing

          deadline exceeded (waited here for <<REPLACED>>)",
        "summary": "Test Suites: 1 failed, 1 total
      Tests:       1 failed, 1 total
      Snapshots:   0 total
      Time:        <<REPLACED>>
      Ran all test suites matching /manual-exceeded-hook.js/i.",
      }
    `),
  );
});

it('throws on deadline exceeded in a describe hook', () => {
  const result = runJest('deadlines', ['manual-exceeded-hook-describe.js']);
  expect(result.exitCode).toBe(1);
  const summary = summaryWithoutTime(result);
  givenNode('>=12', () =>
    expect(summary).toMatchInlineSnapshot(`
Object {
  "rest": "FAIL __tests__/manual-exceeded-hook-describe.js
  describe
    ✕ does nothing

  ● describe › does nothing

    deadline exceeded (waited here for <<REPLACED>>)

      12 | describe('describe', () => {
      13 |   beforeAll(async () => {
    > 14 |     await expect.withinDeadline(sleep(200));
         |     ^
      15 |   }, 50);
      16 | 
      17 |   it('does nothing', () => {});

      at __tests__/manual-exceeded-hook-describe.js:14:5",
  "summary": "Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   0 total
Time:        <<REPLACED>>
Ran all test suites matching /manual-exceeded-hook-describe.js/i.",
}
`),
  );
  givenNode('<12', () =>
    expect(summary).toMatchInlineSnapshot(`
      Object {
        "rest": "FAIL __tests__/manual-exceeded-hook-describe.js
        describe
          ✕ does nothing

        ● describe › does nothing

          deadline exceeded (waited here for <<REPLACED>>)",
        "summary": "Test Suites: 1 failed, 1 total
      Tests:       1 failed, 1 total
      Snapshots:   0 total
      Time:        <<REPLACED>>
      Ran all test suites matching /manual-exceeded-hook-describe.js/i.",
      }
    `),
  );
});

function summaryWithoutTime(result: {stderr: string}) {
  const summary = extractSummary(result.stderr);
  summary.rest = summary.rest.replace(
    /(waited here for) \d*\.?\d+ m?s\b/,
    '$1 <<REPLACED>>',
  );
  return summary;
}
