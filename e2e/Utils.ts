/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs';
import * as path from 'path';
import {Config} from '@jest/types';

// eslint-disable-next-line import/named
import {ExecaReturnValue, sync as spawnSync} from 'execa';
import {createDirectory} from 'jest-util';
import rimraf = require('rimraf');

interface RunResult extends ExecaReturnValue {
  status: number;
  error: Error;
}
export const run = (cmd: string, cwd?: Config.Path): RunResult => {
  const args = cmd.split(/\s/).slice(1);
  const spawnOptions = {cwd, preferLocal: false, reject: false};
  const result = spawnSync(cmd.split(/\s/)[0], args, spawnOptions) as RunResult;

  // For compat with cross-spawn
  result.status = result.exitCode;

  if (result.status !== 0) {
    const message = `
      ORIGINAL CMD: ${cmd}
      STDOUT: ${result.stdout}
      STDERR: ${result.stderr}
      STATUS: ${result.status}
      ERROR: ${result.error}
    `;
    throw new Error(message);
  }

  return result;
};

export const linkJestPackage = (packageName: string, cwd: Config.Path) => {
  const packagesDir = path.resolve(__dirname, '../packages');
  const packagePath = path.resolve(packagesDir, packageName);
  const destination = path.resolve(cwd, 'node_modules/', packageName);
  createDirectory(destination);
  rimraf.sync(destination);
  fs.symlinkSync(packagePath, destination, 'dir');
};

export const makeTemplate = (
  str: string,
): ((values?: Array<any>) => string) => (values?: Array<any>) =>
  str.replace(/\$(\d+)/g, (_match, number) => {
    if (!Array.isArray(values)) {
      throw new Error('Array of values must be passed to the template.');
    }
    return values[number - 1];
  });

export const cleanup = (directory: string) => rimraf.sync(directory);

/**
 * Creates a nested directory with files and their contents
 * writeFiles(
 *   '/home/tmp',
 *   {
 *     'package.json': '{}',
 *     '__tests__/test.test.js': 'test("lol")',
 *   }
 * );
 */
export const writeFiles = (
  directory: string,
  files: {[filename: string]: string},
) => {
  createDirectory(directory);
  Object.keys(files).forEach(fileOrPath => {
    const dirname = path.dirname(fileOrPath);

    if (dirname !== '/') {
      createDirectory(path.join(directory, dirname));
    }
    fs.writeFileSync(
      path.resolve(directory, ...fileOrPath.split('/')),
      files[fileOrPath],
    );
  });
};

export const writeSymlinks = (
  directory: string,
  symlinks: {[existingFile: string]: string},
) => {
  createDirectory(directory);
  Object.keys(symlinks).forEach(fileOrPath => {
    const symLinkPath = symlinks[fileOrPath];
    const dirname = path.dirname(symLinkPath);

    if (dirname !== '/') {
      createDirectory(path.join(directory, dirname));
    }
    fs.symlinkSync(
      path.resolve(directory, ...fileOrPath.split('/')),
      path.resolve(directory, ...symLinkPath.split('/')),
    );
  });
};

const NUMBER_OF_TESTS_TO_FORCE_USING_WORKERS = 25;
/**
 * Forces Jest to use workers by generating many test files to run.
 * Slow and modifies the test output. Use sparingly.
 */
export const generateTestFilesToForceUsingWorkers = () => {
  const testFiles: Record<string, string> = {};
  for (let i = 0; i <= NUMBER_OF_TESTS_TO_FORCE_USING_WORKERS; i++) {
    testFiles[`__tests__/test${i}.test.js`] = `
      test.todo('test ${i}');
    `;
  }
  return testFiles;
};

export const copyDir = (src: string, dest: string) => {
  const srcStat = fs.lstatSync(src);
  if (srcStat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).map(filePath =>
      copyDir(path.join(src, filePath), path.join(dest, filePath)),
    );
  } else {
    fs.writeFileSync(dest, fs.readFileSync(src));
  }
};

export const replaceTime = (str: string) =>
  str
    .replace(/\d*\.?\d+m?s/g, '<<REPLACED>>')
    .replace(/, estimated <<REPLACED>>/g, '');

// Since Jest does not guarantee the order of tests we'll sort the output.
export const sortLines = (output: string) =>
  output
    .split('\n')
    .sort()
    .map(str => str.trim())
    .filter(Boolean)
    .join('\n');

export const createEmptyPackage = (
  directory: Config.Path,
  packageJson?: {[keys: string]: any},
) => {
  const DEFAULT_PACKAGE_JSON = {
    description: 'THIS IS AN AUTOGENERATED FILE AND SHOULD NOT BE ADDED TO GIT',
    jest: {
      testEnvironment: 'node',
    },
  };

  createDirectory(directory);
  packageJson || (packageJson = DEFAULT_PACKAGE_JSON);
  fs.writeFileSync(
    path.resolve(directory, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );
};

export const extractSummary = (stdout: string) => {
  const match = stdout
    .replace(/(?:\\[rn])+/g, '\n')
    .match(
      /Test Suites:.*\nTests.*\nSnapshots.*\nTime.*(\nRan all test suites)*.*\n*$/gm,
    );
  if (!match) {
    throw new Error(
      `
      Could not find test summary in the output.
      OUTPUT:
        ${stdout}
    `,
    );
  }

  const summary = replaceTime(match[0]);

  const rest = stdout
    .replace(match[0], '')
    // remove all timestamps
    .replace(/\s*\(\d*\.?\d+m?s\)$/gm, '');

  return {
    rest: rest.trim(),
    summary: summary.trim(),
  };
};

const sortTests = (stdout: string) =>
  stdout
    .split('\n')
    .reduce((tests: Array<Array<string>>, line) => {
      if (['RUNS', 'PASS', 'FAIL'].includes(line.slice(0, 4))) {
        tests.push([line.trimRight()]);
      } else if (line) {
        tests[tests.length - 1].push(line.trimRight());
      }
      return tests;
    }, [])
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .reduce(
      (array, lines = []) =>
        lines.length > 1 ? array.concat(lines, '') : array.concat(lines),
      [],
    )
    .join('\n');

export const extractSortedSummary = (stdout: string) => {
  const {rest, summary} = extractSummary(stdout);
  return {
    rest: sortTests(replaceTime(rest)),
    summary,
  };
};

export const extractSummaries = (
  stdout: string,
): Array<{rest: string; summary: string}> => {
  const regex = /Test Suites:.*\nTests.*\nSnapshots.*\nTime.*(\nRan all test suites)*.*\n*$/gm;

  let match = regex.exec(stdout);
  const matches: Array<RegExpExecArray> = [];

  while (match) {
    matches.push(match);
    match = regex.exec(stdout);
  }

  return matches
    .map((currentMatch, i) => {
      const prevMatch = matches[i - 1];
      const start = prevMatch ? prevMatch.index + prevMatch[0].length : 0;
      const end = currentMatch.index + currentMatch[0].length;
      return {end, start};
    })
    .map(({start, end}) => extractSortedSummary(stdout.slice(start, end)));
};

export const normalizeIcons = (str: string) => {
  if (!str) {
    return str;
  }

  // Make sure to keep in sync with `jest-cli/src/constants`
  return str
    .replace(new RegExp('\u00D7', 'g'), '\u2715')
    .replace(new RegExp('\u221A', 'g'), '\u2713');
};
