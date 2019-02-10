/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

let createRuntime;

describe('Runtime', () => {
  beforeEach(() => {
    createRuntime = require('createRuntime');
  });

  describe('requireModule', () => {
    it('emulates a node stack trace during module load', () =>
      createRuntime(__filename).then(runtime => {
        let hasThrown = false;
        try {
          runtime.requireModule(runtime.__mockRootPath, './throwing.js');
        } catch (err) {
          hasThrown = true;
          expect(err.stack).toMatch(/^Error: throwing\s+at Object.<anonymous>/);
        }
        expect(hasThrown).toBe(true);
      }));

    it('emulates a node stack trace during function execution', () =>
      createRuntime(__filename).then(runtime => {
        let hasThrown = false;
        const sum = runtime.requireModule(
          runtime.__mockRootPath,
          './throwing_fn.js',
        );

        try {
          sum();
        } catch (err) {
          hasThrown = true;
          if (process.platform === 'win32') {
            expect(err.stack).toMatch(
              /^Error: throwing fn\s+at sum.+\\__tests__\\test_root\\throwing_fn\.js/,
            );
          } else {
            expect(err.stack).toMatch(
              /^Error: throwing fn\s+at sum.+\/__tests__\/test_root\/throwing_fn\.js/,
            );
          }
        }
        expect(hasThrown).toBe(true);
      }));
  });
});
