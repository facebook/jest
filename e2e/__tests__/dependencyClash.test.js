/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import {cleanup, createEmptyPackage, writeFiles} from '../Utils';
import runJest from '../runJest';
import os from 'os';
import {skipSuiteOnWindows} from '../../scripts/ConditionalTest';

skipSuiteOnWindows();

// doing test in a temp directory because we don't want jest node_modules affect it
const tempDir = path.resolve(os.tmpdir(), 'clashing-dependencies-test');
const hasteImplModulePath = path.resolve(
  './packages/jest-haste-map/src/__tests__/haste_impl.js',
);

beforeEach(() => {
  cleanup(tempDir);
  createEmptyPackage(tempDir);
});

// This test case is checking that when having both
// `invariant` package from npm and `invariant.js` that provides `invariant`
// module we can still require the right invariant. This is pretty specific
// use case and in the future we should probably delete this test.
// see: https://github.com/facebook/jest/pull/6687
test('does not require project modules from inside node_modules', () => {
  writeFiles(tempDir, {
    '__tests__/test.js': `
      const invariant = require('invariant');
      test('haii', () => expect(invariant(false, 'haii')).toBe('haii'));
    `,
    'invariant.js': `
      INVALID CODE FRAGMENT THAT WILL BE REMOVED BY THE TRANSFORMER
      const invariant = (condition, message) => message;
      module.exports = invariant;
    `,
    'jest.config.js': `module.exports = {
      haste: {
        hasteImplModulePath: '${hasteImplModulePath}',
      },
      transform: {'.*\\.js': './third-party/node_modules/transform'},
    };`,
    'third-party/node_modules/invariant/index.js': `
      const invariant = (condition, message) => {
        if (!condition) {
          throw new Error(message);
        }
      };
      module.exports = invariant;
    `,
    'third-party/node_modules/transform/index.js': `
      const invariant = require('invariant');
      module.exports = {
        process: script => {
          let threw = false;
          try {
            invariant(false, 'this should throw');
          } catch (e) {
            threw = true;
          }
          if (!threw) {
            throw new Error('It used the wrong invariant module!');
          }
          return script.replace(
            'INVALID CODE FRAGMENT THAT WILL BE REMOVED BY THE TRANSFORMER',
            ''
          );
        },
      };
    `,
  });
  const {stderr, status} = runJest(tempDir, ['--no-cache', '--no-watchman']);
  // make sure there are no errors that lead to invariant.js (if we were to
  // require a wrong `invariant.js` we'd have a syntax error, because jest
  // internals wouldn't be able to parse flow annotations)
  expect(stderr).not.toMatch('invariant');
  expect(stderr).toMatch('PASS');
  expect(status).toBe(0);
});
