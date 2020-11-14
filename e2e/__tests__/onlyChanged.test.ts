/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import * as path from 'path';
import {cleanup, run, testIfHg, writeFiles} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(tmpdir(), 'jest_only_changed');
const GIT = 'git -c user.name=jest_test -c user.email=jest_test@test.com';
const HG = 'hg --config ui.username=jest_test';

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));

test('run for "onlyChanged" and "changedSince"', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '__tests__/file1.test.js': `require('../file1'); test('file1', () => {});`,
    'file1.js': 'module.exports = {}',
    'package.json': '{}',
  });

  run(`${GIT} init`, DIR);
  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "first"`, DIR);

  let stdout = runJest(DIR, ['-o']).stdout;
  expect(stdout).toMatch(
    /No tests found related to files changed since last commit./,
  );

  stdout = runJest(DIR, ['--changedSince=master']).stdout;
  expect(stdout).toMatch(
    /No tests found related to files changed since "master"./,
  );
});

test('run only changed files', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '__tests__/file1.test.js': `require('../file1'); test('file1', () => {});`,
    'file1.js': 'module.exports = {}',
    'package.json': '{}',
  });
  let stderr;
  let stdout;

  ({stdout} = runJest(DIR, ['-o']));
  expect(stdout).toMatch(/Jest can only find uncommitted changed files/);

  run(`${GIT} init`, DIR);
  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "first"`, DIR);

  ({stdout} = runJest(DIR, ['-o']));
  expect(stdout).toMatch('No tests found related to files');

  ({stderr} = runJest(DIR, ['-o', '--lastCommit']));
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file1.test.js/);

  writeFiles(DIR, {
    '__tests__/file2.test.js': `require('../file2'); test('file2', () => {});`,
    '__tests__/file3.test.js': `require('../file3'); test('file3', () => {});`,
    'file2.js': 'module.exports = {}',
    'file3.js': `require('./file2')`,
  });

  ({stderr} = runJest(DIR, ['-o']));

  expect(stderr).not.toMatch(/PASS __tests__(\/|\\)file1.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file2.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file3.test.js/);

  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "second"`, DIR);

  ({stderr} = runJest(DIR, ['-o']));
  expect(stdout).toMatch('No tests found related to files');

  writeFiles(DIR, {
    'file2.js': 'module.exports = {modified: true}',
  });

  ({stderr} = runJest(DIR, ['-o']));
  expect(stderr).not.toMatch(/PASS __tests__(\/|\\)file1.test.j/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file2.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file3.test.js/);
});

test('report test coverage for only changed files', () => {
  writeFiles(DIR, {
    '__tests__/a.test.js': `
    require('../a');
    require('../b');
    test('a', () => expect(1).toBe(1));
  `,
    '__tests__/b.test.js': `
    require('../b');
    test('b', () => expect(1).toBe(1));
  `,
    'a.js': 'module.exports = {}',
    'b.js': 'module.exports = {}',
    'package.json': JSON.stringify({
      jest: {
        collectCoverage: true,
        coverageReporters: ['text'],
        testEnvironment: 'node',
      },
    }),
  });

  run(`${GIT} init`, DIR);
  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "first"`, DIR);

  writeFiles(DIR, {
    'a.js': 'module.exports = {modified: true}',
  });

  let stdout;

  ({stdout} = runJest(DIR));

  // both a.js and b.js should be in the coverage
  expect(stdout).toMatch('a.js');
  expect(stdout).toMatch('b.js');

  ({stdout} = runJest(DIR, ['-o']));

  // coverage should be collected only for a.js
  expect(stdout).toMatch('a.js');
  expect(stdout).not.toMatch('b.js');
});

test('report test coverage of source on test file change under only changed files', () => {
  writeFiles(DIR, {
    '__tests__/a.test.js': `
    require('../a');
    test('a1', () => expect(1).toBe(1));
  `,
    'a.js': 'module.exports = {}',
    'package.json': JSON.stringify({
      jest: {
        collectCoverage: true,
        coverageReporters: ['text'],
        testEnvironment: 'node',
      },
    }),
  });

  run(`${GIT} init`, DIR);
  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "first"`, DIR);

  writeFiles(DIR, {
    '__tests__/a.test.js': `
    require('../a');
    test('a1', () => expect(1).toBe(1));
    test('a2', () => expect(2).toBe(2));
  `,
  });

  const {stdout} = runJest(DIR, ['--only-changed']);

  expect(stdout).toMatch('a.js');
});

test('do not pickup non-tested files when reporting coverage on only changed files', () => {
  writeFiles(DIR, {
    'a.js': 'module.exports = {}',
    'b.test.js': 'module.exports = {}',
    'package.json': JSON.stringify({name: 'original name'}),
  });

  run(`${GIT} init`, DIR);
  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "first"`, DIR);

  writeFiles(DIR, {
    'b.test.js': 'require("./package.json"); it("passes", () => {})',
    'package.json': JSON.stringify({name: 'new name'}),
  });

  const {stderr, stdout, exitCode} = runJest(DIR, [
    '-o',
    '--coverage, --collectCoverageFrom=package.json',
  ]);

  expect(stderr).toEqual(
    expect.not.stringContaining('Failed to collect coverage from'),
  );
  expect(stdout).toEqual(expect.not.stringContaining('package.json'));
  expect(exitCode).toBe(0);
});

test('collect test coverage when using onlyChanged', () => {
  writeFiles(DIR, {
    'a.js': 'module.exports = {}',
    'b.test.js': 'module.exports = {}',
    'package.json': JSON.stringify({
      jest: {collectCoverageFrom: ['a.js']},
      name: 'original name',
    }),
  });

  run(`${GIT} init`, DIR);
  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "first"`, DIR);
  run(`${GIT} checkout -b new-branch`, DIR);

  writeFiles(DIR, {
    'b.test.js': 'it("passes", () => {expect(1).toBe(1)})',
  });

  const {stderr, exitCode} = runJest(DIR, ['-o', '--coverage']);
  expect(stderr).toEqual(
    expect.not.stringContaining('Failed to collect coverage from'),
  );
  expect(exitCode).toBe(0);
});

test('onlyChanged in config is overwritten by --all or testPathPattern', () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '__tests__/file1.test.js': `require('../file1'); test('file1', () => {});`,
    'file1.js': 'module.exports = {}',
    'package.json': JSON.stringify({jest: {onlyChanged: true}}),
  });
  let stderr;
  let stdout;

  ({stdout} = runJest(DIR));
  expect(stdout).toMatch(/Jest can only find uncommitted changed files/);

  run(`${GIT} init`, DIR);
  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "first"`, DIR);

  ({stdout, stderr} = runJest(DIR));
  expect(stdout).toMatch('No tests found related to files');
  expect(stderr).not.toMatch(
    'Unknown option "onlyChanged" with value true was found',
  );

  ({stderr} = runJest(DIR, ['--lastCommit']));
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file1.test.js/);

  writeFiles(DIR, {
    '__tests__/file2.test.js': `require('../file2'); test('file2', () => {});`,
    '__tests__/file3.test.js': `require('../file3'); test('file3', () => {});`,
    'file2.js': 'module.exports = {}',
    'file3.js': `require('./file2')`,
  });

  ({stderr} = runJest(DIR));

  expect(stderr).not.toMatch(/PASS __tests__(\/|\\)file1.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file2.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file3.test.js/);

  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "second"`, DIR);

  ({stderr} = runJest(DIR));
  expect(stdout).toMatch('No tests found related to files');

  ({stderr, stdout} = runJest(DIR, ['file2.test.js']));
  expect(stdout).not.toMatch('No tests found related to files');
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file2.test.js/);
  expect(stderr).toMatch('1 total');

  writeFiles(DIR, {
    'file2.js': 'module.exports = {modified: true}',
  });

  ({stderr} = runJest(DIR));
  expect(stderr).not.toMatch(/PASS __tests__(\/|\\)file1.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file2.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file3.test.js/);

  ({stderr} = runJest(DIR, ['--all']));
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file1.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file2.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file3.test.js/);
});

testIfHg('gets changed files for hg', async () => {
  if (process.env.CI) {
    // Circle and Travis have very old version of hg (v2, and current
    // version is v4.2) and its API changed since then and not compatible
    // any more. Changing the SCM version on CIs is not trivial, so we'll just
    // skip this test and run it only locally.
    return;
  }
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '__tests__/file1.test.js': `require('../file1'); test('file1', () => {});`,
    'file1.js': 'module.exports = {}',
    'package.json': JSON.stringify({jest: {testEnvironment: 'node'}}),
  });

  run(`${HG} init`, DIR);
  run(`${HG} add .`, DIR);
  run(`${HG} commit -m "test"`, DIR);

  let stdout;
  let stderr;

  ({stdout, stderr} = runJest(DIR, ['-o']));
  expect(stdout).toMatch('No tests found related to files changed');

  writeFiles(DIR, {
    '__tests__/file2.test.js': `require('../file2'); test('file2', () => {});`,
    'file2.js': 'module.exports = {}',
    'file3.js': `require('./file2')`,
  });

  ({stdout, stderr} = runJest(DIR, ['-o']));
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file2.test.js/);

  run(`${HG} add .`, DIR);
  run(`${HG} commit -m "test2"`, DIR);

  writeFiles(DIR, {
    '__tests__/file3.test.js': `require('../file3'); test('file3', () => {});`,
  });

  ({stdout, stderr} = runJest(DIR, ['-o']));
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file3.test.js/);
  expect(stderr).not.toMatch(/PASS __tests__(\/|\\)file2.test.js/);

  ({stdout, stderr} = runJest(DIR, ['-o', '--changedFilesWithAncestor']));
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file2.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file3.test.js/);
});

test('path on Windows is case-insensitive', () => {
  if (process.platform !== 'win32') {
    // This test is Windows specific, skip it on other platforms.
    return;
  }

  const modifiedDIR = path.resolve(DIR, 'outer_dir', 'inner_dir');
  const incorrectModifiedDIR = path.resolve(DIR, 'OUTER_dir', 'inner_dir');

  writeFiles(modifiedDIR, {
    '.watchmanconfig': '',
    '__tests__/file1.test.js': `require('../file1'); test('file1', () => {});`,
    'file1.js': 'module.exports = {}',
    'package.json': '{}',
  });

  run(`${GIT} init`, modifiedDIR);
  run(`${GIT} add .`, modifiedDIR);
  run(`${GIT} commit --no-gpg-sign -m "first"`, modifiedDIR);

  const {stdout} = runJest(incorrectModifiedDIR, ['-o']);
  expect(stdout).toMatch('No tests found related to files');

  writeFiles(modifiedDIR, {
    '__tests__/file2.test.js': `require('../file2'); test('file2', () => {});`,
    '__tests__/file3.test.js': `require('../file3'); test('file3', () => {});`,
    'file2.js': 'module.exports = {}',
    'file3.js': `require('./file2')`,
  });

  const {stderr} = runJest(incorrectModifiedDIR, ['-o']);

  expect(stderr).not.toMatch(/PASS __tests__(\/|\\)file1.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file2.test.js/);
  expect(stderr).toMatch(/PASS __tests__(\/|\\)file3.test.js/);
});
