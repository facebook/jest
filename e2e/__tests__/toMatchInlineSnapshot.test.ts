/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import * as fs from 'graceful-fs';
import {wrap} from 'jest-snapshot-serializer-raw';
import {cleanup, makeTemplate, writeFiles} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(__dirname, '../to-match-inline-snapshot');
const TESTS_DIR = path.resolve(DIR, '__tests__');

const readFile = (filename: string) =>
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
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(exitCode).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('initial write');
  }

  {
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(stderr).not.toMatch('1 snapshot written from 1 test suite.');
    expect(exitCode).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot passed');
  }

  {
    writeFiles(TESTS_DIR, {
      [filename]: readFile(filename).replace('original value', 'updated value'),
    });
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshot name: `inline snapshots 1`');
    expect(exitCode).toBe(1);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot mismatch');
  }

  {
    const {stderr, exitCode} = runJest(DIR, [
      '-w=1',
      '--ci=false',
      filename,
      '-u',
    ]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot updated from 1 test suite.');
    expect(exitCode).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot updated');
  }
});

test('do not indent empty lines', () => {
  const filename = 'empty-line-indent.test.js';
  const template = makeTemplate(
    `test('inline snapshots', () => expect($1).toMatchInlineSnapshot());\n`,
  );

  {
    writeFiles(TESTS_DIR, {
      [filename]: template(['`hello\n\nworld`']),
    });
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(exitCode).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('initial write');
  }

  {
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(stderr).not.toMatch('1 snapshot written from 1 test suite.');
    expect(exitCode).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot passed');
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
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(exitCode).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('initial write');
  }

  {
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(exitCode).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot passed');
  }

  {
    writeFiles(TESTS_DIR, {
      [filename]: readFile(filename).replace('new Date()', '"string"'),
    });
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshot name: `handles property matchers 1`');
    expect(stderr).toMatch('Snapshots:   1 failed, 1 total');
    expect(exitCode).toBe(1);
    expect(wrap(fileAfter)).toMatchSnapshot('snapshot failed');
  }

  {
    writeFiles(TESTS_DIR, {
      [filename]: readFile(filename).replace('any(Date)', 'any(String)'),
    });
    const {stderr, exitCode} = runJest(DIR, [
      '-w=1',
      '--ci=false',
      filename,
      '-u',
    ]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot updated from 1 test suite.');
    expect(exitCode).toBe(0);
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
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(exitCode).toBe(0);
    expect(wrap(fileAfter)).toMatchSnapshot('initial write');
    expect(fs.existsSync(snapshotPath)).toEqual(true);
  }

  {
    writeFiles(TESTS_DIR, {[filename]: template(['toMatchInlineSnapshot'])});
    const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshots:   1 obsolete, 1 written, 1 total');
    expect(exitCode).toBe(1);
    expect(wrap(fileAfter)).toMatchSnapshot('inline snapshot written');
    expect(fs.existsSync(snapshotPath)).toEqual(true);
  }

  {
    const {stderr, exitCode} = runJest(DIR, [
      '-w=1',
      '--ci=false',
      filename,
      '-u',
    ]);
    const fileAfter = readFile(filename);
    expect(stderr).toMatch('Snapshots:   1 file removed, 1 passed, 1 total');
    expect(exitCode).toBe(0);
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
  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('2 snapshots written from 1 test suite.');
  expect(exitCode).toBe(0);
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
  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(exitCode).toBe(0);
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
  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);

  const fileAfter = readFile(filename);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(exitCode).toBe(0);
  expect(wrap(fileAfter)).toMatchSnapshot();
});

// issue: https://github.com/facebook/jest/issues/6702
test('handles mocking native modules prettier relies on', () => {
  const filename = 'mockFail.test.js';
  const test = `
    jest.mock('path', () => ({}));
    jest.mock('fs', () => ({}));
    jest.mock('graceful-fs', () => ({}));
    test('inline snapshots', () => {
      expect({}).toMatchInlineSnapshot();
    });
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(exitCode).toBe(0);
});

test('supports custom matchers', () => {
  const filename = 'custom-matchers.test.js';
  const test = `
    const { toMatchInlineSnapshot } = require('jest-snapshot');
    expect.extend({
      toMatchCustomInlineSnapshot(received, ...args) {
        return toMatchInlineSnapshot.call(this, received, ...args);
      }
    });
    test('inline snapshots', () => {
      expect({apple: "original value"}).toMatchCustomInlineSnapshot();
    });
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(exitCode).toBe(0);
  expect(wrap(fileAfter)).toMatchSnapshot('custom matchers');
});

test('supports custom matchers with property matcher', () => {
  const filename = 'custom-matchers-with-property-matcher.test.js';
  const test = `
    const { toMatchInlineSnapshot } = require('jest-snapshot');
    expect.extend({
      toMatchCustomInlineSnapshot(received, ...args) {
        return toMatchInlineSnapshot.call(this, received, ...args);
      },
      toMatchUserInlineSnapshot(received, ...args) {
        return toMatchInlineSnapshot.call(
          this,
          received,
          {
            createdAt: expect.any(Date),
            id: expect.any(Number),
          },
          ...args
        );
      },
    });
    test('inline snapshots', () => {
      const user = {
        createdAt: new Date(),
        id: Math.floor(Math.random() * 20),
        name: 'LeBron James',
      };
      expect(user).toMatchCustomInlineSnapshot({
        createdAt: expect.any(Date),
        id: expect.any(Number),
      });
      expect(user).toMatchUserInlineSnapshot();
    });
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('2 snapshots written from 1 test suite.');
  expect(exitCode).toBe(0);
  expect(wrap(fileAfter)).toMatchSnapshot(
    'custom matchers with property matcher',
  );
});

test('multiple custom matchers and native matchers', () => {
  const filename = 'multiple-matchers.test.js';
  const test = `
    const { toMatchInlineSnapshot } = require('jest-snapshot');
    expect.extend({
      toMatchCustomInlineSnapshot(received, ...args) {
        return toMatchInlineSnapshot.call(this, received, ...args);
      },
      toMatchCustomInlineSnapshot2(received, ...args) {
        return toMatchInlineSnapshot.call(this, received, ...args);
      },
    });
    test('inline snapshots', () => {
      expect({apple: "value 1"}).toMatchCustomInlineSnapshot();
      expect({apple: "value 2"}).toMatchInlineSnapshot();
      expect({apple: "value 3"}).toMatchCustomInlineSnapshot2();
      expect({apple: "value 4"}).toMatchInlineSnapshot();
    });
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('4 snapshots written from 1 test suite.');
  expect(exitCode).toBe(0);
  expect(wrap(fileAfter)).toMatchSnapshot('multiple matchers');
});

test('indentation is correct in the presences of existing snapshots', () => {
  const filename = 'existing-snapshot.test.js';
  const test = `
    test('existing snapshot', () => {
      expect({ hello: 'world' }).toMatchInlineSnapshot(\`
        Object {
          "hello": "world",
        }
      \`);
      expect({ hello: 'world' }).toMatchInlineSnapshot();
    });
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(exitCode).toBe(0);
  expect(wrap(fileAfter)).toMatchSnapshot('existing snapshot');
});

test('indentation is correct in the presences of existing snapshots, when the file is correctly formatted by prettier', () => {
  const filename = 'existing-snapshot.test.js';
  const test = `
    it('is true', () => {
      expect(true).toMatchInlineSnapshot(\`true\`);
      expect([1, 2, 3]).toMatchInlineSnapshot();
    });\\n
  `;

  writeFiles(TESTS_DIR, {[filename]: test});
  const {stderr, exitCode} = runJest(DIR, ['-w=1', '--ci=false', filename]);
  const fileAfter = readFile(filename);
  expect(stderr).toMatch('1 snapshot written from 1 test suite.');
  expect(exitCode).toBe(0);
  expect(wrap(fileAfter)).toMatchSnapshot('existing snapshot');
});
