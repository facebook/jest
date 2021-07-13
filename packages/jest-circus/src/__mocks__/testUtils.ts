/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createHash} from 'crypto';
import {tmpdir} from 'os';
import * as path from 'path';
import {ExecaSyncReturnValue, sync as spawnSync} from 'execa';
import * as fs from 'graceful-fs';

const CIRCUS_PATH = require.resolve('../../build').replace(/\\/g, '\\\\');
const CIRCUS_RUN_PATH = require
  .resolve('../../build/run')
  .replace(/\\/g, '\\\\');
const CIRCUS_STATE_PATH = require
  .resolve('../../build/state')
  .replace(/\\/g, '\\\\');
const TEST_EVENT_HANDLER_PATH = require
  .resolve('./testEventHandler')
  .replace(/\\/g, '\\\\');
const BABEL_REGISTER_PATH = require
  .resolve('@babel/register')
  .replace(/\\/g, '\\\\');

interface Result extends ExecaSyncReturnValue {
  status: number;
  error: string;
}

export const runTest = (source: string) => {
  const filename = createHash('md5').update(source).digest('hex');
  const tmpFilename = path.join(tmpdir(), filename);

  const content = `
    require('${BABEL_REGISTER_PATH}')({extensions: [".js", ".ts"]});
    const circus = require('${CIRCUS_PATH}');
    global.test = circus.test;
    global.describe = circus.describe;
    global.beforeEach = circus.beforeEach;
    global.afterEach = circus.afterEach;
    global.beforeAll = circus.beforeAll;
    global.afterAll = circus.afterAll;

    const testEventHandler = require('${TEST_EVENT_HANDLER_PATH}').default;
    const addEventHandler = require('${CIRCUS_STATE_PATH}').addEventHandler;
    const removeEventHandler = require('${CIRCUS_STATE_PATH}').removeEventHandler;
    addEventHandler(testEventHandler);

    ${source};

    const run = require('${CIRCUS_RUN_PATH}').default;

    run();
  `;

  fs.writeFileSync(tmpFilename, content);
  const result = spawnSync('node', [tmpFilename], {
    cwd: process.cwd(),
  }) as Result;

  // For compat with cross-spawn
  result.status = result.exitCode;

  if (result.status !== 0) {
    const message = `
      STDOUT: ${result.stdout && result.stdout.toString()}
      STDERR: ${result.stderr && result.stderr.toString()}
      STATUS: ${result.status}
      ERROR: ${String(result.error)}
    `;
    throw new Error(message);
  }

  result.stdout = String(result.stdout);
  result.stderr = String(result.stderr);

  fs.unlinkSync(tmpFilename);

  if (result.stderr) {
    throw new Error(
      `
      Unexpected stderr:
      ${result.stderr}
    `,
    );
  }
  return result;
};
