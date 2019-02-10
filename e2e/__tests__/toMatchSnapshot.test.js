/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import {cleanup, makeTemplate, writeFiles} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(__dirname, '../to-match-snapshot');
const TESTS_DIR = path.resolve(DIR, '__tests__');

beforeEach(() => cleanup(TESTS_DIR));
afterAll(() => cleanup(TESTS_DIR));

test('basic support', () => {
  const filename = 'basic-support.test.js';
  const template = makeTemplate(
    `test('snapshots', () => expect($1).toMatchSnapshot());`,
  );

  {
    writeFiles(TESTS_DIR, {
      [filename]: template(['{apple: "original value"}']),
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }

  {
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(stderr).not.toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }

  {
    writeFiles(TESTS_DIR, {
      [filename]: template(['{apple: "updated value"}']),
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Received value does not match stored snapshot');
    expect(status).toBe(1);
  }

  {
    const {stderr, status} = runJest(DIR, [
      '-w=1',
      '--ci=false',
      filename,
      '-u',
    ]);
    expect(stderr).toMatch('1 snapshot updated from 1 test suite.');
    expect(status).toBe(0);
  }
});

test('error thrown before snapshot', () => {
  const filename = 'error-thrown-before-snapshot.test.js';
  const template = makeTemplate(`test('snapshots', () => {
      expect($1).toBeTruthy();
      expect($2).toMatchSnapshot();
    });`);

  {
    writeFiles(TESTS_DIR, {
      [filename]: template(['true', '{a: "original"}']),
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }

  {
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(status).toBe(0);
  }

  {
    writeFiles(TESTS_DIR, {
      [filename]: template(['false', '{a: "original"}']),
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).not.toMatch('1 obsolete snapshot found');
    expect(status).toBe(1);
  }
});

test('first snapshot fails, second passes', () => {
  const filename = 'first-snapshot-fails-second-passes.test.js';
  const template = makeTemplate(`test('snapshots', () => {
      expect($1).toMatchSnapshot();
      expect($2).toMatchSnapshot();
    });`);

  {
    writeFiles(TESTS_DIR, {[filename]: template([`'apple'`, `'banana'`])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('2 snapshots written from 1 test suite.');
    expect(status).toBe(0);
  }

  {
    writeFiles(TESTS_DIR, {[filename]: template([`'kiwi'`, `'banana'`])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Received value does not match stored snapshot');
    expect(stderr).toMatch('- "apple"\n    + "kiwi"');
    expect(stderr).not.toMatch('1 obsolete snapshot found');
    expect(status).toBe(1);
  }
});

test('does not mark snapshots as obsolete in skipped tests', () => {
  const filename = 'no-obsolete-if-skipped.test.js';
  const template = makeTemplate(`test('snapshots', () => {
      expect(true).toBe(true);
    });

    $1('will be skipped', () => {
      expect({a: 6}).toMatchSnapshot();
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template(['test'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }

  {
    writeFiles(TESTS_DIR, {[filename]: template(['test.skip'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).not.toMatch('1 obsolete snapshot found');
    expect(status).toBe(0);
  }
});

test('accepts custom snapshot name', () => {
  const filename = 'accept-custom-snapshot-name.test.js';
  const template = makeTemplate(`test('accepts custom snapshot name', () => {
      expect(true).toMatchSnapshot('custom-name');
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template()});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }
});

test('handles property matchers', () => {
  const filename = 'handle-property-matchers.test.js';
  const template = makeTemplate(`test('handles property matchers', () => {
      expect({createdAt: $1}).toMatchSnapshot({createdAt: expect.any(Date)});
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template(['new Date()'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }

  {
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(status).toBe(0);
  }

  {
    writeFiles(TESTS_DIR, {[filename]: template(['"string"'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch(
      'Received value does not match snapshot properties for "handles property matchers 1".',
    );
    expect(stderr).toMatch('Snapshots:   1 failed, 1 total');
    expect(status).toBe(1);
  }
});

test('handles invalid property matchers', () => {
  const filename = 'handle-property-matchers.test.js';
  {
    writeFiles(TESTS_DIR, {
      [filename]: `test('invalid property matchers', () => {
        expect({foo: 'bar'}).toMatchSnapshot(null);
      });
    `,
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Property matchers must be an object.');
    expect(status).toBe(1);
  }
  {
    writeFiles(TESTS_DIR, {
      [filename]: `test('invalid property matchers', () => {
        expect({foo: 'bar'}).toMatchSnapshot(null, 'test-name');
      });
    `,
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Property matchers must be an object.');
    expect(stderr).toMatch(
      'To provide a snapshot test name without property matchers, use: toMatchSnapshot("name")',
    );
    expect(status).toBe(1);
  }
  {
    writeFiles(TESTS_DIR, {
      [filename]: `test('invalid property matchers', () => {
        expect({foo: 'bar'}).toMatchSnapshot(undefined, 'test-name');
      });
    `,
    });
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Property matchers must be an object.');
    expect(stderr).toMatch(
      'To provide a snapshot test name without property matchers, use: toMatchSnapshot("name")',
    );
    expect(status).toBe(1);
  }
});

test('handles property matchers with custom name', () => {
  const filename = 'handle-property-matchers-with-name.test.js';
  const template = makeTemplate(`test('handles property matchers with name', () => {
      expect({createdAt: $1}).toMatchSnapshot({createdAt: expect.any(Date)}, 'custom-name');
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template(['new Date()'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }

  {
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(status).toBe(0);
  }

  {
    writeFiles(TESTS_DIR, {[filename]: template(['"string"'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch(
      'Received value does not match snapshot properties for "handles property matchers with name: custom-name 1".',
    );
    expect(stderr).toMatch('Expected snapshot to match properties:');
    expect(stderr).toMatch('Snapshots:   1 failed, 1 total');
    expect(status).toBe(1);
  }
});

test('handles property matchers with deep properties', () => {
  const filename = 'handle-property-matchers-with-name.test.js';
  const template = makeTemplate(`test('handles property matchers with deep properties', () => {
      expect({ user: { createdAt: $1, name: $2 }}).toMatchSnapshot({ user: { createdAt: expect.any(Date), name: $2 }});
    });
    `);

  {
    writeFiles(TESTS_DIR, {[filename]: template(['new Date()', '"Jest"'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('1 snapshot written from 1 test suite.');
    expect(status).toBe(0);
  }

  {
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch('Snapshots:   1 passed, 1 total');
    expect(status).toBe(0);
  }

  {
    writeFiles(TESTS_DIR, {[filename]: template(['"string"', '"Jest"'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch(
      'Received value does not match snapshot properties for "handles property matchers with deep properties 1".',
    );
    expect(stderr).toMatch('Expected snapshot to match properties:');
    expect(stderr).toMatch('Snapshots:   1 failed, 1 total');
    expect(status).toBe(1);
  }

  {
    writeFiles(TESTS_DIR, {[filename]: template(['new Date()', '"CHANGED"'])});
    const {stderr, status} = runJest(DIR, ['-w=1', '--ci=false', filename]);
    expect(stderr).toMatch(
      'Received value does not match stored snapshot "handles property matchers with deep properties 1"',
    );
    expect(stderr).toMatch('Snapshots:   1 failed, 1 total');
    expect(status).toBe(1);
  }
});
