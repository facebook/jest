/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as path from 'path';
import {Writable} from 'stream';
import * as fs from 'graceful-fs';
import execa = require('execa');
import type {Config} from '@jest/types';
import type {FormattedTestResults} from '@jest/test-result';
import stripAnsi = require('strip-ansi');
import {normalizeIcons} from './Utils';

const JEST_PATH = path.resolve(__dirname, '../packages/jest-cli/bin/jest.js');

type RunJestOptions = {
  preserveSymlinks?: string;
  nodeFlags?: Array<string>;
  nodeOptions?: string;
  nodePath?: string;
  skipPkgJsonCheck?: boolean; // don't complain if can't find package.json
  stripAnsi?: boolean; // remove colors from stdout and stderr,
  timeout?: number; // kill the Jest process after X milliseconds
  env?: Record<string, string>;
};

// return the result of the spawned process:
//  [ 'status', 'signal', 'output', 'pid', 'stdout', 'stderr',
//    'envPairs', 'options', 'args', 'file' ]
export default function runJest(
  dir: string,
  args?: Array<string>,
  options: RunJestOptions = {},
): RunJestResult {
  return normalizeStdoutAndStderr(spawnJest(dir, args, options), options);
}

function spawnJest(
  dir: string,
  args?: Array<string>,
  options?: RunJestOptions,
  spawnAsync?: false,
): RunJestResult;
function spawnJest(
  dir: string,
  args?: Array<string>,
  options?: RunJestOptions,
  spawnAsync?: true,
): execa.ExecaChildProcess;

// Spawns Jest and returns either a Promise (if spawnAsync is true) or the completed child process
function spawnJest(
  dir: string,
  args: Array<string> = [],
  options: RunJestOptions = {},
  spawnAsync: boolean = false,
): execa.ExecaSyncReturnValue | execa.ExecaChildProcess {
  const isRelative = !path.isAbsolute(dir);

  if (isRelative) {
    dir = path.resolve(__dirname, dir);
  }

  const localPackageJson = path.resolve(dir, 'package.json');
  if (!options.skipPkgJsonCheck && !fs.existsSync(localPackageJson)) {
    throw new Error(
      `
      Make sure you have a local package.json file at
        "${localPackageJson}".
      Otherwise Jest will try to traverse the directory tree and find the
      global package.json, which will send Jest into infinite loop.
    `,
    );
  }
  const env = Object.assign({}, process.env, {FORCE_COLOR: '0'}, options.env);

  if (options.nodeOptions) env['NODE_OPTIONS'] = options.nodeOptions;
  if (options.nodePath) env['NODE_PATH'] = options.nodePath;
  if (options.preserveSymlinks)
    env['NODE_PRESERVE_SYMLINKS'] = options.preserveSymlinks;

  const spawnArgs = [JEST_PATH, ...args];
  if (options.nodeFlags) {
    spawnArgs.unshift(...options.nodeFlags);
  }
  const spawnOptions = {
    cwd: dir,
    env,
    reject: false,
    timeout: options.timeout || 0,
  };

  return (spawnAsync ? execa : execa.sync)(
    process.execPath,
    spawnArgs,
    spawnOptions,
  );
}

export type RunJestResult = execa.ExecaReturnValue;

export interface RunJestJsonResult extends RunJestResult {
  json: FormattedTestResults;
}

function normalizeStdoutAndStderr(
  result: RunJestResult,
  options: RunJestOptions,
): RunJestResult {
  result.stdout = normalizeIcons(result.stdout);
  if (options.stripAnsi) result.stdout = stripAnsi(result.stdout);
  result.stderr = normalizeIcons(result.stderr);
  if (options.stripAnsi) result.stderr = stripAnsi(result.stderr);

  return result;
}

// Runs `jest` with `--json` option and adds `json` property to the result obj.
//   'success', 'startTime', 'numTotalTests', 'numTotalTestSuites',
//   'numRuntimeErrorTestSuites', 'numPassedTests', 'numFailedTests',
//   'numPendingTests', 'testResults'
export const json = function (
  dir: string,
  args?: Array<string>,
  options: RunJestOptions = {},
): RunJestJsonResult {
  args = [...(args || []), '--json'];
  const result = runJest(dir, args, options);
  try {
    return {
      ...result,
      json: JSON.parse(result.stdout || ''),
    };
  } catch (e) {
    throw new Error(
      `
      Can't parse JSON.
      ERROR: ${e.name} ${e.message}
      STDOUT: ${result.stdout}
      STDERR: ${result.stderr}
    `,
    );
  }
};

type StdErrAndOutString = {stderr: string; stdout: string};
type ConditionFunction = (arg: StdErrAndOutString) => boolean;

// Runs `jest` continously (watch mode) and allows the caller to wait for
// conditions on stdout and stderr and to end the process.
export const runContinuous = function (
  dir: string,
  args?: Array<string>,
  options: RunJestOptions = {},
) {
  const jestPromise = spawnJest(dir, args, {timeout: 30000, ...options}, true);

  let stderr = '';
  let stdout = '';
  const pending = new Set<(arg: StdErrAndOutString) => void>();

  const dispatch = () => {
    for (const fn of pending) {
      fn({stderr, stdout});
    }
  };

  jestPromise.stdout!.pipe(
    new Writable({
      write(chunk, _encoding, callback) {
        stdout += chunk.toString('utf8');
        dispatch();
        callback();
      },
    }),
  );

  jestPromise.stderr!.pipe(
    new Writable({
      write(chunk, _encoding, callback) {
        stderr += chunk.toString('utf8');
        dispatch();
        callback();
      },
    }),
  );

  return {
    async end() {
      jestPromise.kill();

      const result = await jestPromise;

      // Not sure why we have to assign here... The ones on `result` are empty strings
      result.stdout = stdout;
      result.stderr = stderr;

      return normalizeStdoutAndStderr(result, options);
    },

    getCurrentOutput(): StdErrAndOutString {
      return {stderr, stdout};
    },

    getInput() {
      return jestPromise.stdin;
    },

    async waitUntil(fn: ConditionFunction) {
      await new Promise(resolve => {
        const check = (state: StdErrAndOutString) => {
          if (fn(state)) {
            pending.delete(check);
            resolve();
          }
        };
        pending.add(check);
      });
    },
  };
};

// return type matches output of logDebugMessages
export function getConfig(
  dir: string,
  args: Array<string> = [],
  options?: RunJestOptions,
): {
  globalConfig: Config.GlobalConfig;
  configs: Array<Config.ProjectConfig>;
  version: string;
} {
  const {exitCode, stdout} = runJest(
    dir,
    args.concat('--show-config'),
    options,
  );

  expect(exitCode).toBe(0);

  return JSON.parse(stdout);
}
