/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import * as path from 'path';
import semver = require('semver');
import {cleanup, run, writeFiles} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(tmpdir(), 'jest_only_changed');
const GIT = 'git -c user.name=jest_test -c user.email=jest_test@test.com';

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

  gitInit(DIR);
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

