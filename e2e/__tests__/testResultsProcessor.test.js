/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @flow
 */
'use strict';

import path from 'path';
import {json as runWithJson} from '../runJest';

test('testNamePattern', () => {
  const processorPath = path.resolve(
    __dirname,
    '../test-results-processor/processor.js',
  );
  const result = runWithJson('test-results-processor', [
    '--json',
    `--testResultsProcessor=${processorPath}`,
  ]);
  const json = result.json;
  expect(json.processed).toBe(true);
});
