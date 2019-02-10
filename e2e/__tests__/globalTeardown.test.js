/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @flow
 */
'use strict';

import fs from 'fs';
import {createDirectory} from 'jest-util';
import os from 'os';
import path from 'path';
import runJest, {json as runWithJson} from '../runJest';
import {cleanup} from '../Utils';

const DIR = path.join(os.tmpdir(), 'jest-global-teardown');
const project1DIR = path.join(os.tmpdir(), 'jest-global-teardown-project-1');
const project2DIR = path.join(os.tmpdir(), 'jest-global-teardown-project-2');

beforeEach(() => {
  cleanup(DIR);
  cleanup(project1DIR);
  cleanup(project2DIR);
});
afterAll(() => {
  cleanup(DIR);
  cleanup(project1DIR);
  cleanup(project2DIR);
});

test('globalTeardown is triggered once after all test suites', () => {
  createDirectory(DIR);
  const teardownPath = path.resolve(
    __dirname,
    '../global-teardown/teardown.js',
  );
  const result = runWithJson('global-teardown', [
    `--globalTeardown=${teardownPath}`,
    `--testPathPattern=__tests__`,
  ]);

  expect(result.status).toBe(0);
  const files = fs.readdirSync(DIR);
  expect(files).toHaveLength(1);
  const teardown = fs.readFileSync(path.join(DIR, files[0]), 'utf8');
  expect(teardown).toBe('teardown');
});

test('jest throws an error when globalTeardown does not export a function', () => {
  const teardownPath = path.resolve(
    __dirname,
    '../global-teardown/invalidTeardown.js',
  );
  const {status, stderr} = runJest('global-teardown', [
    `--globalTeardown=${teardownPath}`,
    `--testPathPattern=__tests__`,
  ]);

  expect(status).toBe(1);
  expect(stderr).toMatch(
    `TypeError: globalTeardown file must export a function at ${teardownPath}`,
  );
});

test('globalTeardown function gets jest config object as a parameter', () => {
  const teardownPath = path.resolve(
    __dirname,
    '../global-teardown/teardownWithConfig.js',
  );

  const testPathPattern = 'pass';

  const result = runJest('global-teardown', [
    `--globalTeardown=${teardownPath}`,
    `--testPathPattern=${testPathPattern}`,
  ]);

  expect(result.stdout).toBe(testPathPattern);
});

test('should call globalTeardown function of multiple projects', () => {
  const configPath = path.resolve(
    __dirname,
    '../global-teardown/projects.jest.config.js',
  );

  const result = runWithJson('global-teardown', [`--config=${configPath}`]);

  expect(result.status).toBe(0);

  expect(fs.existsSync(DIR)).toBe(true);
  expect(fs.existsSync(project1DIR)).toBe(true);
  expect(fs.existsSync(project2DIR)).toBe(true);
});

test('should not call a globalTeardown of a project if there are no tests to run from this project', () => {
  const configPath = path.resolve(
    __dirname,
    '../global-teardown/projects.jest.config.js',
  );

  const result = runWithJson('global-teardown', [
    `--config=${configPath}`,
    '--testPathPattern=project-1',
  ]);

  expect(result.status).toBe(0);

  expect(fs.existsSync(DIR)).toBe(true);
  expect(fs.existsSync(project1DIR)).toBe(true);
  expect(fs.existsSync(project2DIR)).toBe(false);
});

test('globalTeardown works with default export', () => {
  const teardownPath = path.resolve(
    __dirname,
    '../global-teardown/teardownWithDefaultExport.js',
  );

  const testPathPattern = 'pass';

  const result = runJest('global-teardown', [
    `--globalTeardown=${teardownPath}`,
    `--testPathPattern=${testPathPattern}`,
  ]);

  expect(result.stdout).toBe(testPathPattern);
});

test('globalTeardown throws with named export', () => {
  const teardownPath = path.resolve(
    __dirname,
    '../global-teardown/invalidTeardownWithNamedExport.js',
  );

  const {status, stderr} = runJest('global-teardown', [
    `--globalTeardown=${teardownPath}`,
    `--testPathPattern=__tests__`,
  ]);

  expect(status).toBe(1);
  expect(stderr).toMatch(
    `TypeError: globalTeardown file must export a function at ${teardownPath}`,
  );
});
