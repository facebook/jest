/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

let createRuntime;

describe('Runtime requireActual', () => {
  beforeEach(() => {
    createRuntime = require('createRuntime');
  });

  it('requires node module when manual mock exists', () =>
    createRuntime(__filename).then(runtime => {
      const exports = runtime.requireActual(
        runtime.__mockRootPath,
        'mocked-node-module',
      );
      expect(exports.isManualMockModule).toBe(false);
    }));
});
