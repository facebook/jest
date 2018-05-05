/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

import type {Path} from 'types/Config';

const {sync: spawnSync} = require('execa');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

const run = (cmd: string, cwd?: Path) => {
  const args = cmd.split(/\s/).slice(1);
  const spawnOptions = {cwd, reject: false};
  const result = spawnSync(cmd.split(/\s/)[0], args, spawnOptions);

  // For compat with cross-spawn
  result.status = result.code;

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

const linkJestPackage = (packageName: string, cwd: Path) => {
  const packagesDir = path.resolve(__dirname, '../packages');
  const packagePath = path.resolve(packagesDir, packageName);
  const destination = path.resolve(cwd, 'node_modules/');
  mkdirp.sync(destination);
  rimraf.sync(destination);
  fs.symlinkSync(packagePath, destination, 'dir');
};

const fileExists = (filePath: Path) => {
  try {
    fs.accessSync(filePath, fs.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

const makeTemplate = (str: string): ((values?: Array<any>) => string) => {
  return (values: ?Array<any>) => {
    return str.replace(/\$(\d+)/g, (match, number) => {
      if (!Array.isArray(values)) {
        throw new Error('Array of values must be passed to the template.');
      }
      return values[number - 1];
    });
  };
};

const cleanup = (directory: string) => rimraf.sync(directory);

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
const writeFiles = (directory: string, files: {[filename: string]: string}) => {
  mkdirp.sync(directory);
  Object.keys(files).forEach(fileOrPath => {
    const filePath = fileOrPath.split('/'); // ['tmp', 'a.js']
    const filename = filePath.pop(); // filepath becomes dirPath (no filename)

    if (filePath.length) {
      mkdirp.sync(path.join.apply(path, [directory].concat(filePath)));
    }
    fs.writeFileSync(
      path.resolve.apply(path, [directory].concat(filePath, [filename])),
      files[fileOrPath],
    );
  });
};

const copyDir = (src: string, dest: string) => {
  const srcStat = fs.lstatSync(src);
  if (srcStat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).map(filePath => {
      return copyDir(path.join(src, filePath), path.join(dest, filePath));
    });
  } else {
    fs.writeFileSync(dest, fs.readFileSync(src));
  }
};

const createEmptyPackage = (
  directory: Path,
  packageJson?: {[keys: string]: any},
) => {
  const DEFAULT_PACKAGE_JSON = {
    description: 'THIS IS AN AUTOGENERATED FILE AND SHOULD NOT BE ADDED TO GIT',
    jest: {
      testEnvironment: 'node',
    },
  };

  mkdirp.sync(directory);
  packageJson || (packageJson = DEFAULT_PACKAGE_JSON);
  fs.writeFileSync(
    path.resolve(directory, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );
};

type ExtractSummaryOptions = {|
  stripLocation: boolean,
|};

const extractSummary = (
  stdout: string,
  {stripLocation = false}: ExtractSummaryOptions = {},
) => {
  const match = stdout.match(
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

  const summary = match[0]
    .replace(/\d*\.?\d+m?s/g, '<<REPLACED>>')
    .replace(/, estimated <<REPLACED>>/g, '');

  let rest = cleanupStackTrace(
    // remove all timestamps
    stdout.slice(0, -match[0].length).replace(/\s*\(\d*\.?\d+m?s\)$/gm, ''),
  );

  if (stripLocation) {
    rest = rest.replace(/(at .*):\d+:\d+/g, '$1:<<LINE>>:<<COLUMN>>');
  }

  return {rest, summary};
};

// different versions of Node print different stack traces. This function
// unifies their output to make it possible to snapshot them.
// TODO: Remove when we drop support for node 4
const cleanupStackTrace = (output: string) => {
  return output
    .replace(/.*(?=packages)/g, '      at ')
    .replace(/^.*at.*[\s][\(]?(\S*\:\d*\:\d*).*$/gm, '      at $1');
};

module.exports = {
  cleanup,
  copyDir,
  createEmptyPackage,
  extractSummary,
  fileExists,
  linkJestPackage,
  makeTemplate,
  run,
  writeFiles,
};
