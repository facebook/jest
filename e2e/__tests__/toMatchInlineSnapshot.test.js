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
import {cleanup, makeTemplate, writeFiles} from '../Utils';
import runJest from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

const DIR = path.resolve(__dirname, '../to-match-inline-snapshot');
const TESTS_DIR = path.resolve(DIR, '__tests__');

const readFile = filename =>
  fs.readFileSync(path.join(TESTS_DIR, filename), 'utf8');

beforeEach(() => cleanup(TESTS_DIR));
afterAll(() => cleanup(TESTS_DIR));

test('basic support', () => {
  const filename = 'basic-support.test.js';
  const template = makeTemplate(
    `test('inline snapshots', () => expect($1).toMatchInlineSnapshot());\n`,
  );

  {
    writeFiles(TESTS_DIR, {
      [filename]: template(['{apple: "original value"}']),
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('initial write');
  }

  {
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(stderr).not.toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot passed');
  }

  {
    writeFiles(TESTS_DIR, {
      [filename]: readFile(filename).replace('original value', 'updated value'),
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Received value does not match stored snapshot');
    expect(status).toBe(1);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot mismatch');
  }

  {
    const {stderr, status} = runJest(DIR, [
      '-w=1',
      '--ci=false',
      filename,
      '-u',
    ]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot updated from 1 test suite.');
    expect(status).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot updated');
  }
});

test('handles property matchers', () => {
  const filename = 'handle-property-matchers.test.js';
  const template = makeTemplate(`test('handles property matchers', () => {
      expect({createdAt: $1}).toMatchInlineSnapshot({createdAt: expect.any(Date)});
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template(['new Date()'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('initial write');
  }

  {
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(status).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot passed');
  }

  {
    writeFiles(TESTS_DIR, {
      [filename]: readFile(filename).replace('new Date()', '"string"'),
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch(
      'Received value does not match snapshot properties for "handles property matchers 1".',
    );
    expect(stderr).toMatch('Snapshots:   1 failed, 1 total');
    expect(status).toBe(1);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot failed');
  }

  {
    writeFiles(TESTS_DIR, {
      [filename]: readFile(filename).replace('any(Date)', 'any(String)'),
    });
    const {stderr, status} = runJest(DIR, [
      '-w=1',
      '--ci=false',
      filename,
      '-u',
    ]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot updated from 1 test suite.');
    expect(status).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot updated');
  }
});

test('removes obsolete external snapshots', () => {
  const filename = 'removes-obsolete-external-snapshots.test.js';
  const snapshotPath = path.join(
    TESTS_DIR,
    '__snapshots__',
    filename + '.snap',
  );
  const template = makeTemplate(`
    test('removes obsolete external snapshots', () => {
      expect('1').$1();
    });
  `);

  {
    writeFiles(TESTS_DIR, {[filename]: template(['toMatchSnapshot'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('initial write');
    expect(fs.existsSync(snapshotPath)).toEqual(true);
  }

  {
    writeFiles(TESTS_DIR, {[filename]: template(['toMatchInlineSnapshot'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshots:   1 obsolete, 1 written, 1 total');
    expect(status).toBe(1);
    expect(wrap(fileAfter)).toMatchSnapshot('inline snapshot written');
    expect(fs.existsSync(snapshotPath)).toEqual(true);
  }

  {
    const {stderr, status} = runJest(DIR, [
      '-w=1',
      '--ci=false',
      filename,
      '-u',
    ]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshots:   1 file removed, 1 passed, 1 total');
    expect(status).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('external snapshot cleaned');
    expect(fs.existsSync(snapshotPath)).toEqual(false);
  }
});

test('supports async matchers', () => {
  const filename = 'async-matchers.test.js';
  const test = `
    test('inline snapshots', async () => {
      expect(Promise.resolve('success')).resolves.toMatchInlineSnapshot();
      expect(Promise.reject('fail')).rejects.toMatchInlineSnapshot();
    });
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('2 snapshots written from 1 test suite.');
  expect(status).toBe(0);
  expect(wrap(fileAfter)).toMatchSnapshot();
});

test('supports async tests', () => {
  const filename = 'async.test.js';
  const test = `
    test('inline snapshots', async () => {
      await 'next tick';
      expect(42).toMatchInlineSnapshot();
    });
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(status).toBe(0);
  expect(wrap(fileAfter)).toMatchSnapshot();
});

test('writes snapshots with non-literals in expect(...)', () => {
  const filename = 'async.test.js';
  const test = `
    it('works with inline snapshots', () => {
      expect({a: 1}).toMatchInlineSnapshot();
    });
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);

  const fileAfter = readFile(filename);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(status).toBe(0);
  expect(wrap(fileAfter)).toMatchSnapshot();
});

// issue: https://github.com/facebook/jest/issues/6702
test('handles mocking native modules prettier relies on', () => {
  const filename = 'mockFail.test.js';
  const test = `
    jest.mock('path', () => ({}));
    jest.mock('fs', () => ({}));
    test('inline snapshots', () => {
      expect({}).toMatchInlineSnapshot();
    });
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(status).toBe(0);
});
