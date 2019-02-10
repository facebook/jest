/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import {cleanup, extractSummaries, writeFiles} from '../Utils';
import os from 'os';
import runJest from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

const DIR = path.resolve(os.tmpdir(), 'watch-mode-update-snapshot');
const pluginPath = path.resolve(__dirname, '../MockStdinWatchPlugin');

beforeEach(() => cleanup(DIR));
afterAll(() => cleanup(DIR));

expect.addSnapshotSerializer({
  print: val => val.replace(/\[s\[u/g, '\n'),
  test: val => typeof val === 'string' && val.includes('[s[u'),
});

const setupFiles = input => {
  writeFiles(DIR, {
    '__tests__/__snapshots__/bar.spec.js.snap': `// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[\`bar 1\`] = \`"foo"\`;
    `,
    '__tests__/bar.spec.js': `
      test('bar', () => { expect('bar').toMatchSnapshot(); });
    `,
    'package.json': JSON.stringify({
      jest: {
        testEnvironment: 'node',
        watchPlugins: [[pluginPath, {input}]],
      },
    }),
  });
};

test('can press "u" to update snapshots', () => {
  const input = [{keys: ['u']}, {keys: ['q']}];
  setupFiles(input);

  const {status, stderr} = runJest(DIR, ['--no-watchman', '--watchAll']);
  const results = extractSummaries(stderr);
  expect(results).toHaveLength(2);
  results.forEach(({rest, summary}) => {
    expect(wrap(rest)).toMatchSnapshot('test results');
    expect(wrap(summary)).toMatchSnapshot('test summary');
  });
  expect(status).toBe(0);
});
