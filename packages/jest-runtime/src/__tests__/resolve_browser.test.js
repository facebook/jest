/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

let createRuntime;

describe('resolve', () => {
  beforeEach(() => {
    createRuntime = require('createRuntime');
  });

  it('respects "browser" dependency when browser:true configured', () =>
    createRuntime(__filename, {
      browser: true,
    }).then(runtime => {
      const exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'jest-resolve-test',
      );
      expect(exports.isBrowser).toBe(true);
    }));

  it(`doesn't resolve "browser" dependency by default`, () =>
    createRuntime(
      __filename,
      {},
      {
        browser: false,
      },
    ).then(runtime => {
      const exports = runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'jest-resolve-test',
      );
      expect(exports.isBrowser).toBe(false);
    }));
});
