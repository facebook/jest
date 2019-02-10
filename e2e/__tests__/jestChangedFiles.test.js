/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import os from 'os';
import path from 'path';
import {wrap} from 'jest-snapshot-serializer-raw';
import {findRepos, getChangedFilesForRoots} from 'jest-changed-files';
import {skipSuiteOnWindows} from '../../scripts/ConditionalTest';
import {cleanup, run, writeFiles} from '../Utils';
import runJest from '../runJest';

skipSuiteOnWindows();

const DIR = path.resolve(os.tmpdir(), 'jest-changed-files-test-dir');

const GIT = 'git -c user.name=jest_test -c user.email=jest_test@test.com';
const HG = 'hg --config ui.username=jest_test';

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));

test('gets hg SCM roots and dedups them', async () => {
  writeFiles(DIR, {
    'first-repo/file1.txt': 'file1',
    'first-repo/nested-dir/file2.txt': 'file2',
    'first-repo/nested-dir/second-nested-dir/file3.txt': 'file3',
    'second-repo/file1.txt': 'file1',
    'second-repo/nested-dir/file2.txt': 'file2',
    'second-repo/nested-dir/second-nested-dir/file3.txt': 'file3',
  });

  run(`${HG} init`, path.resolve(DIR, 'first-repo'));
  run(`${HG} init`, path.resolve(DIR, 'second-repo'));

  const roots = [
    '',
    'first-repo/nested-dir',
    'first-repo/nested-dir/second-nested-dir',
    'second-repo/nested-dir',
    'second-repo/nested-dir/second-nested-dir',
  ].map(filename => path.resolve(DIR, filename));

  const repos = await findRepos(roots);
  expect(repos.git.size).toBe(0);

  const hgRepos = Array.from(repos.hg);

  // it's not possible to match the exact path because it will resolve
  // differently on different platforms.
  // NOTE: This test can break if you have a .hg repo initialized inside your
  // os tmp directory.
  expect(hgRepos).toHaveLength(2);
  expect(hgRepos[0]).toMatch(/\/jest-changed-files-test-dir\/first-repo$/);
  expect(hgRepos[1]).toMatch(/\/jest-changed-files-test-dir\/second-repo$/);
});

test('gets git SCM roots and dedups them', async () => {
  writeFiles(DIR, {
    'first-repo/file1.txt': 'file1',
    'first-repo/nested-dir/file2.txt': 'file2',
    'first-repo/nested-dir/second-nested-dir/file3.txt': 'file3',
    'second-repo/file1.txt': 'file1',
    'second-repo/nested-dir/file2.txt': 'file2',
    'second-repo/nested-dir/second-nested-dir/file3.txt': 'file3',
  });

  run(`${GIT} init`, path.resolve(DIR, 'first-repo'));
  run(`${GIT} init`, path.resolve(DIR, 'second-repo'));

  const roots = [
    '',
    'first-repo/nested-dir',
    'first-repo/nested-dir/second-nested-dir',
    'second-repo/nested-dir',
    'second-repo/nested-dir/second-nested-dir',
  ].map(filename => path.resolve(DIR, filename));

  const repos = await findRepos(roots);
  expect(repos.hg.size).toBe(0);
  const gitRepos = Array.from(repos.git);

  // it's not possible to match the exact path because it will resolve
  // differently on different platforms.
  // NOTE: This test can break if you have a .git repo initialized inside your
  // os tmp directory.
  expect(gitRepos).toHaveLength(2);
  expect(gitRepos[0]).toMatch(/\/jest-changed-files-test-dir\/first-repo$/);
  expect(gitRepos[1]).toMatch(/\/jest-changed-files-test-dir\/second-repo$/);
});

test('gets mixed git and hg SCM roots and dedups them', async () => {
  writeFiles(DIR, {
    'first-repo/file1.txt': 'file1',
    'first-repo/nested-dir/file2.txt': 'file2',
    'first-repo/nested-dir/second-nested-dir/file3.txt': 'file3',
    'second-repo/file1.txt': 'file1',
    'second-repo/nested-dir/file2.txt': 'file2',
    'second-repo/nested-dir/second-nested-dir/file3.txt': 'file3',
  });

  run(`${GIT} init`, path.resolve(DIR, 'first-repo'));
  run(`${HG} init`, path.resolve(DIR, 'second-repo'));

  const roots = [
    '',
    'first-repo/nested-dir',
    'first-repo/nested-dir/second-nested-dir',
    'second-repo/nested-dir',
    'second-repo/nested-dir/second-nested-dir',
  ].map(filename => path.resolve(DIR, filename));

  const repos = await findRepos(roots);
  const hgRepos = Array.from(repos.hg);
  const gitRepos = Array.from(repos.git);

  // NOTE: This test can break if you have a .git  or .hg repo initialized
  // inside your os tmp directory.
  expect(gitRepos).toHaveLength(1);
  expect(hgRepos).toHaveLength(1);
  expect(gitRepos[0]).toMatch(/\/jest-changed-files-test-dir\/first-repo$/);
  expect(hgRepos[0]).toMatch(/\/jest-changed-files-test-dir\/second-repo$/);
});

test('gets changed files for git', async () => {
  writeFiles(DIR, {
    'file1.txt': 'file1',
    'nested-dir/file2.txt': 'file2',
    'nested-dir/second-nested-dir/file3.txt': 'file3',
  });

  run(`${GIT} init`, DIR);

  const roots = ['', 'nested-dir', 'nested-dir/second-nested-dir'].map(
    filename => path.resolve(DIR, filename),
  );

  let {changedFiles: files} = await getChangedFilesForRoots(roots, {});
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);

  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "test"`, DIR);

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {}));
  expect(Array.from(files)).toEqual([]);

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {
    lastCommit: true,
  }));
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);

  writeFiles(DIR, {
    'file1.txt': 'modified file1',
  });

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {}));
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt']);

  run(`${GIT} commit --no-gpg-sign -am "test2"`, DIR);

  writeFiles(DIR, {
    'file4.txt': 'file4',
  });

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {
    withAncestor: true,
  }));
  // Returns files from current uncommitted state + the last commit
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt', 'file4.txt']);

  run(`${GIT} add file4.txt`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "test3"`, DIR);

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {
    changedSince: 'HEAD^^',
  }));
  // Returns files from the last 2 commits
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt', 'file4.txt']);

  run(`${GIT} checkout HEAD^^ -b feature-branch`, DIR);

  writeFiles(DIR, {
    'file5.txt': 'file5',
  });
  run(`${GIT} add file5.txt`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "test5"`, DIR);

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {
    changedSince: 'master',
  }));
  // Returns files from this branch but not ones that only exist on master
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file5.txt']);
});

test('monitors only root paths for git', async () => {
  writeFiles(DIR, {
    'file1.txt': 'file1',
    'nested-dir/file2.txt': 'file2',
    'nested-dir/second-nested-dir/file3.txt': 'file3',
  });

  run(`${GIT} init`, DIR);

  const roots = [path.resolve(DIR, 'nested-dir')];

  const {changedFiles: files} = await getChangedFilesForRoots(roots, {});
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file2.txt', 'file3.txt']);
});

test('handles a bad revision for "changedSince", for git', async () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '__tests__/file1.test.js': `require('../file1'); test('file1', () => {});`,
    'file1.js': 'module.exports = {}',
    'package.json': '{}',
  });

  run(`${GIT} init`, DIR);
  run(`${GIT} add .`, DIR);
  run(`${GIT} commit --no-gpg-sign -m "first"`, DIR);

  const {status, stderr} = runJest(DIR, ['--changedSince=blablabla']);

  expect(status).toBe(1);
  expect(wrap(stderr)).toMatchSnapshot();
});

test('gets changed files for hg', async () => {
  if (process.env.CI) {
    // Circle and Travis have very old version of hg (v2, and current
    // version is v4.2) and its API changed since then and not compatible
    // any more. Changing the SCM version on CIs is not trivial, so we'll just
    // skip this test and run it only locally.
    return;
  }
  writeFiles(DIR, {
    'file1.txt': 'file1',
    'nested-dir/file2.txt': 'file2',
    'nested-dir/second-nested-dir/file3.txt': 'file3',
  });

  run(`${HG} init`, DIR);

  const roots = ['', 'nested-dir', 'nested-dir/second-nested-dir'].map(
    filename => path.resolve(DIR, filename),
  );

  let {changedFiles: files} = await getChangedFilesForRoots(roots, {});
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);

  run(`${HG} add .`, DIR);
  run(`${HG} commit -m "test"`, DIR);

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {}));
  expect(Array.from(files)).toEqual([]);

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {
    lastCommit: true,
  }));
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);

  writeFiles(DIR, {
    'file1.txt': 'modified file1',
  });

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {}));
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt']);

  run(`${HG} commit -m "test2"`, DIR);

  writeFiles(DIR, {
    'file4.txt': 'file4',
  });

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {
    withAncestor: true,
  }));
  // Returns files from current uncommitted state + the last commit
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt', 'file4.txt']);

  run(`${HG} add file4.txt`, DIR);
  run(`${HG} commit -m "test3"`, DIR);

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {
    changedSince: '-3',
  }));
  // Returns files from the last 2 commits
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file1.txt', 'file4.txt']);

  run(`${HG} bookmark main`, DIR);
  // Back up and develop on a different branch
  run(`${HG} checkout --rev=-2`, DIR);

  writeFiles(DIR, {
    'file5.txt': 'file5',
  });
  run(`${HG} add file5.txt`, DIR);
  run(`${HG} commit -m "test4"`, DIR);

  ({changedFiles: files} = await getChangedFilesForRoots(roots, {
    changedSince: 'main',
  }));
  // Returns files from this branch but not ones that only exist on main
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file5.txt']);
});

test('monitors only root paths for hg', async () => {
  if (process.env.CI) {
    // Circle and Travis have very old version of hg (v2, and current
    // version is v4.2) and its API changed since then and not compatible
    // any more. Changing the SCM version on CIs is not trivial, so we'll just
    // skip this test and run it only locally.
    return;
  }
  writeFiles(DIR, {
    'file1.txt': 'file1',
    'nested-dir/file2.txt': 'file2',
    'nested-dir/second-nested-dir/file3.txt': 'file3',
  });

  run(`${HG} init`, DIR);

  const roots = [path.resolve(DIR, 'nested-dir')];

  const {changedFiles: files} = await getChangedFilesForRoots(roots, {});
  expect(
    Array.from(files)
      .map(filePath => path.basename(filePath))
      .sort(),
  ).toEqual(['file2.txt', 'file3.txt']);
});

test('handles a bad revision for "changedSince", for hg', async () => {
  writeFiles(DIR, {
    '.watchmanconfig': '',
    '__tests__/file1.test.js': `require('../file1'); test('file1', () => {});`,
    'file1.js': 'module.exports = {}',
    'package.json': '{}',
  });

  run(`${HG} init`, DIR);
  run(`${HG} add .`, DIR);
  run(`${HG} commit -m "first"`, DIR);

  const {status, stderr} = runJest(DIR, ['--changedSince=blablabla']);

  expect(status).toBe(1);
  expect(wrap(stderr)).toMatchSnapshot();
});
