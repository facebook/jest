/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @flow
 */

'use strict';

import runJest from '../runJest';
import os from 'os';
import path from 'path';
import {cleanup, writeFiles} from '../Utils';

const DIR = path.resolve(os.tmpdir(), 'jest-path-pattern-reporter-message');

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));

test('prints a message with path pattern at the end', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '__tests__/a.test.js': `test('a', () => {});`,
    '__tests__/b.test.js': `test('b', () => {});`,
    'package.json': '{}',
  });
  let stderr;

  ({stderr} = runJest(DIR, ['a']));
  expect(stderr).toMatch('Ran all test suites matching /a/i');

  ({stderr} = runJest(DIR, ['a', 'b']));
  expect(stderr).toMatch('Ran all test suites matching /a|b/i');

  ({stderr} = runJest(DIR, ['--testPathPattern', 'a']));
  expect(stderr).toMatch('Ran all test suites matching /a/i');

  ({stderr} = runJest(DIR, ['--testPathPattern', 'a|b']));
  expect(stderr).toMatch('Ran all test suites matching /a|b/i');
});
