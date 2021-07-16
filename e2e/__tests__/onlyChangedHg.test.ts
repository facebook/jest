/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import * as path from 'path';
import semver = require('semver');
import {cleanup, run, testIfHg, writeFiles} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(tmpdir(), 'jest_only_changed');
const GIT = 'git -c user.name=jest_test -c user.email=jest_test@test.com';
const HG = 'hg --config ui.username=jest_test';

const gitVersionSupportsInitialBranch = (() => {
  const {stdout} = run(`${GIT} --version`);
  const gitVersion = stdout.trim();

  const match = gitVersion.match(/^git version (?<version>\d+\.\d+\.\d+)/);

  if (match?.groups?.version == null) {
    throw new Error(`Unable to parse git version from string "${gitVersion}"`);
  }

  const {version} = match.groups;

  return semver.gte(version, '2.28.0');
})();

const mainBranchName = gitVersionSupportsInitialBranch ? 'main' : 'master';

function gitInit(dir: string) {
  const initCommand = gitVersionSupportsInitialBranch
    ? `${GIT} init --initial-branch=${mainBranchName}`
    : `${GIT} init`;

  run(initCommand, dir);
}

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));


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