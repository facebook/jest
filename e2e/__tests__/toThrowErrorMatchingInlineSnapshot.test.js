/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import fs from 'fs';
import {cleanup, makeTemplate, writeFiles} from '../Utils';
import runJest from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

const DIR = path.resolve(
  __dirname,
  '../to-throw-error-matching-inline-snapshot',
);
const TESTS_DIR = path.resolve(DIR, '__tests__');

const readFile = filename =>
  fs.readFileSync(path.join(TESTS_DIR, filename), 'utf8');

beforeEach(() => cleanup(TESTS_DIR));
afterAll(() => cleanup(TESTS_DIR));

test('works fine when function throws error', () => {
  const filename = 'works-fine-when-function-throws-error.test.js';
  const template = makeTemplate(`
    test('works fine when function throws error', () => {
      expect(() => {
        throw new Error('apple');
      })
        .toThrowErrorMatchingInlineSnapshot();
    });
  `);

  {
    writeFiles(TESTS_DIR, {[filename]: template()});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(wrap(fileAfter)).toMatchSnapshot('initial write');
    expect(status).toBe(0);
  }
});

test('updates existing snapshot', () => {
  const filename = 'updates-existing-snapshot.test.js';
  const template = makeTemplate(`
    test('updates existing snapshot', () => {
      expect(() => {
        throw new Error('apple');
      })
        .toThrowErrorMatchingInlineSnapshot(\`"banana"\`);
    });
  `);

  {
    writeFiles(TESTS_DIR, {[filename]: template()});
    const {stderr, status} = runJest(DIR, [
      '-w=1',
      '--ci=false',
      filename,
      '-u',
    ]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot updated from 1 test suite.');
    expect(wrap(fileAfter)).toMatchSnapshot('updated snapshot');
    expect(status).toBe(0);
  }
});

test('cannot be used with .not', () => {
  const filename = 'cannot-be-used-with-not.test.js';
  const template = makeTemplate(`
    test('cannot be used with .not', () => {
      expect('').not.toThrowErrorMatchingInlineSnapshot();
    });
  `);

  {
    writeFiles(TESTS_DIR, {[filename]: template()});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch(
      'Jest: `.not` cannot be used with `.toThrowErrorMatchingInlineSnapshot()`.',
    );
    expect(status).toBe(1);
  }
});

test('should support rejecting promises', () => {
  const filename = 'should-support-rejecting-promises.test.js';
  const template = makeTemplate(`
    test('should support rejecting promises', async () => {
      await expect(Promise.reject(new Error('octopus')))
        .rejects.toThrowErrorMatchingInlineSnapshot();
    });
  `);

  writeFiles(TESTS_DIR, {[filename]: template()});
  const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(wrap(fileAfter)).toMatchSnapshot();
  expect(status).toBe(0);
});
