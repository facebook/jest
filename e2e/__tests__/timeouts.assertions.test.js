/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @flow
 */

'use strict';

import path from 'path';
import {cleanup, extractSummary, writeFiles} from '../Utils';
import {skipSuiteOnJasmine} from '../../scripts/ConditionalTest';

import runJest from '../runJest';

const DIR = path.resolve(__dirname, '../timeouts');

skipSuiteOnJasmine();
beforeEach(() => cleanup(DIR));
afterAll(() => cleanup(DIR));

test('exceeds the timeout, without reporting expect.assertions', () => {
  writeFiles(DIR, {
    '__tests__/a-banana.js': `
      jest.setTimeout(20);

      test('banana', () => {
        expect.assertions(2);
        return new Promise(resolve => {
          setTimeout(resolve, 100);
        });
      });
    `,
    'package.json': '{}',
  });

  const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false']);
  const {rest, summary} = extractSummary(stderr);
  expect(rest).not.toMatch(/Expected two assertions/);
  expect(rest).toMatchSnapshot();
  expect(summary).toMatchSnapshot();
  expect(status).toBe(1);
});

test('exceeds the timeout synchronously', () => {
  writeFiles(DIR, {
    '__tests__/a-banana.js': `
      jest.setTimeout(20);

      test('banana', () => {
        expect.assertions(2);
        const startTime = Date.now();
        while (Date.now() - startTime < 100) {
        }
      });
    `,
    'package.json': '{}',
  });

  const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false']);
  const {rest, summary} = extractSummary(stderr);
  expect(rest).toMatch(
    /(jest\.setTimeout|jasmine\.DEFAULT_TIMEOUT_INTERVAL|Exceeded timeout)/,
  );
  expect(rest).not.toMatch(/Expected two assertions/);
  expect(rest).toMatchSnapshot();
  expect(summary).toMatchSnapshot();
  expect(status).toBe(1);
});
