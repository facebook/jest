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

const DIR = path.resolve(__dirname, '../to-throw-error-matching-snapshot');
const TESTS_DIR = path.resolve(DIR, '__tests__');

beforeEach(() => cleanup(TESTS_DIR));
afterAll(() => cleanup(TESTS_DIR));

test('works fine when function throws error', () => {
  const filename = 'works-fine-when-function-throws-error.test.js';
  const template = makeTemplate(`test('works fine when function throws error', () => {
       expect(() => { throw new Error('apple'); })
         .toThrowErrorMatchingSnapshot();
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template()});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }
});

test(`throws the error if tested function didn't throw error`, () => {
  const filename = 'throws-if-tested-function-did-not-throw.test.js';
  const template = makeTemplate(`test('throws the error if tested function did not throw error', () => {
      expect(() => {}).toThrowErrorMatchingSnapshot();
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template()});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch(`Expected the function to throw an error.`);
    expect(status).toBe(1);
  }
});

test('accepts custom snapshot name', () => {
  const filename = 'accept-custom-snapshot-name.test.js';
  const template = makeTemplate(`test('accepts custom snapshot name', () => {
      expect(() => { throw new Error('apple'); })
        .toThrowErrorMatchingSnapshot('custom-name');
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template()});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }
});

test('cannot be used with .not', () => {
  const filename = 'cannot-be-used-with-not.test.js';
  const template = makeTemplate(`test('cannot be used with .not', () => {
       expect('').not.toThrowErrorMatchingSnapshot();
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template()});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch(
      'Jest: `.not` cannot be used with `.toThrowErrorMatchingSnapshot()`.',
    );
    expect(status).toBe(1);
  }
});

test('should support rejecting promises', () => {
  const filename = 'should-support-rejecting-promises.test.js';
  const template = makeTemplate(`test('should support rejecting promises', () => {
      return expect(Promise.reject(new Error('octopus'))).rejects.toThrowErrorMatchingSnapshot();
    });
  `);

  {
    writeFiles(TESTS_DIR, {[filename]: template()});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);

    const snapshot = fs.readFileSync(
      `${TESTS_DIR}/__snapshots__/${filename}.snap`,
      'utf8',
    );

    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(wrap(snapshot)).toMatchSnapshot();
    expect(status).toBe(0);
  }
});
