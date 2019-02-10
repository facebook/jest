/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import vm from 'vm';
import path from 'path';
import os from 'os';
import ScriptTransformer from '../ScriptTransformer';

jest.mock('vm');

const FILE_PATH_TO_INSTRUMENT = path.resolve(
  __dirname,
  './module_dir/to_be_instrumented.js',
);

it('instruments files', () => {
  const config = {
    cache: false,
    cacheDirectory: os.tmpdir(),
    rootDir: '/',
  };
  const instrumented = new ScriptTransformer(config).transform(
    FILE_PATH_TO_INSTRUMENT,
    {collectCoverage: true},
  ).script;
  expect(instrumented instanceof vm.Script).toBe(true);
  // We can't really snapshot the resulting coverage, because it depends on
  // absolute path of the file, which will be different on different
  // machines
  expect(vm.Script.mock.calls[0][0]).toMatch(`gcv = "__coverage__"`);
});
