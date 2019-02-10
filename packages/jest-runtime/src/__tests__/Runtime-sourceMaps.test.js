/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+jsinfra
 */
'use strict';

let createRuntime;

describe('Runtime', () => {
  beforeEach(() => {
    createRuntime = require('createRuntime');
  });

  describe('requireModule', () => {
    it('installs source maps if available', () => {
      expect.assertions(1);

      return createRuntime(__filename).then(runtime => {
        const sum = runtime.requireModule(
          runtime.__mockRootPath,
          './sourcemaps/out/throwing-mapped-fn.js',
        ).sum;

        try {
          sum();
        } catch (err) {
          if (process.platform === 'win32') {
            expect(err.stack).toMatch(
              /^Error: throwing fn\s+at sum.+\\__tests__\\test_root\\sourcemaps\\(out\\)?throwing-mapped-fn.js:\d+:\d+/,
            );
          } else {
            expect(err.stack).toMatch(
              /^Error: throwing fn\s+at sum.+\/__tests__\/test_root\/sourcemaps\/(out\/)?throwing-mapped-fn.js:\d+:\d+/,
            );
          }
        }
      });
    });
  });
});
