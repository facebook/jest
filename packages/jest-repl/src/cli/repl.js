/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig, ProjectConfig} from 'types/Config';

declare var jestGlobalConfig: GlobalConfig;
declare var jestProjectConfig: ProjectConfig;
declare var jest: Object;

import path from 'path';
import repl from 'repl';
import vm from 'vm';

let transformer;

const evalCommand = (cmd, context, filename, callback, config) => {
  let result;
  try {
    if (transformer) {
      cmd = transformer.process(
        cmd,
        jestGlobalConfig.replname || 'jest.js',
        jestProjectConfig,
      );
    }
    result = vm.runInThisContext(cmd);
  } catch (e) {
    return callback(isRecoverableError(e) ? new repl.Recoverable(e) : e);
  }
  return callback(null, result);
};

const isRecoverableError = error => {
  if (error && error.name === 'SyntaxError') {
    return [
      'Unterminated template',
      'Missing } in template expression',
      'Unexpected end of input',
      'missing ) after argument list',
      'Unexpected token',
    ].some(exception => error.message.includes(exception));
  }
  return false;
};

if (jestProjectConfig.transform) {
  let transformerPath = null;
  for (let i = 0; i < jestProjectConfig.transform.length; i++) {
    if (new RegExp(jestProjectConfig.transform[i][0]).test('foobar.js')) {
      transformerPath = jestProjectConfig.transform[i][1];
      break;
    }
  }
  if (transformerPath) {
    /* $FlowFixMe */
    transformer = require(transformerPath);
    if (typeof transformer.process !== 'function') {
      throw new TypeError(
        'Jest: a transformer must export a `process` function.',
      );
    }
  }
}

const replInstance = repl.start({
  eval: evalCommand,
  prompt: '\u203A ',
  useGlobal: true,
});

// $FlowFixMe: https://github.com/facebook/flow/pull/4713
replInstance.context.require = moduleName => {
  if (/(\/|\\|\.)/.test(moduleName)) {
    moduleName = path.resolve(process.cwd(), moduleName);
  }
  /* $FlowFixMe */
  return require(moduleName);
};
