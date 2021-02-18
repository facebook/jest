/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import {skipSuiteOnJasmine} from '@jest/test-utils';
import {extractSummary, runYarnInstall} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(__dirname, '..', 'babel-plugin-jest-deadlines');

beforeAll(() => {
  runYarnInstall(DIR);
});

skipSuiteOnJasmine();

it('passes generally', () => {
  const result = runJest('babel-plugin-jest-deadlines', [
    '--no-cache',
    'plain.test.js',
  ]);
  expect(result.exitCode).toBe(1);
  expect(summaryWithoutTime(result)).toMatchSnapshot();
});

it('throws on deadline exceeded', () => {
  const result = runJest('babel-plugin-jest-deadlines', [
    '--no-cache',
    'typescript.test.ts',
  ]);
  expect(result.exitCode).toBe(1);
  expect(summaryWithoutTime(result)).toMatchSnapshot();
});

function summaryWithoutTime(result: {stderr: string}) {
  const summary = extractSummary(result.stderr);
  summary.rest = summary.rest.replace(
    /(waited here for) \d*\.?\d+ m?s\b/,
    '$1 <<REPLACED>>',
  );
  return summary;
}
