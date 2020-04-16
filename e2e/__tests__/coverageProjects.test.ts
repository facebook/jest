/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as fs from 'fs';
import * as path from 'path';
import {wrap} from 'jest-snapshot-serializer-raw';
import {run} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(__dirname, '../coverage-projects');

beforeAll(() => {
  run('yarn', DIR);
});

test('outputs coverage report', () => {
  const {stdout, exitCode} = runJest(DIR, ['--no-cache', '--coverage'], {
    stripAnsi: true,
  });
  const coverageDir = path.join(DIR, 'coverage');

  // - the `index.js` file in package `mul` is ignored and should not be in the
  //  coverage report.
  expect(wrap(stdout)).toMatchSnapshot();

  // `index.js` should only appear once (in package `add`)
  expect(stdout.match(/index\.js/g)).toHaveLength(1);

  expect(() => fs.accessSync(coverageDir, fs.F_OK)).not.toThrow();
  expect(exitCode).toBe(0);
});
