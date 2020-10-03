/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const dedent = require('dedent');

let platform;

function testRequire(filename) {
  return () => (platform = require(filename));
}

test('should explicitly resolve filename.<platform>.js', () => {
  expect(testRequire('../test1.android.js')).not.toThrow();
  expect(platform.extension).toBe('android.js');
});

test('should explicitly resolve filename.native.js', () => {
  expect(testRequire('../test1.native.js')).not.toThrow();
  expect(platform.extension).toBe('native.js');
});

test('should explicitly resolve filename.js', () => {
  expect(testRequire('../test1.js')).not.toThrow();
  expect(platform.extension).toBe('js');
});

test('should explicitly resolve filename.json', () => {
  expect(testRequire('../test1.json')).not.toThrow();
  expect(platform.extension).toBe('json');
});

test('should resolve filename.<platform>.js', () => {
  expect(testRequire('../test1')).not.toThrow();
  expect(platform.extension).toBe('android.js');
});

test('should resolve filename.<platform>.js from haste package', () => {
  expect(testRequire('custom-resolve/test1')).not.toThrow();
  expect(platform.extension).toBe('android.js');
});

test('should resolve filename.native.js', () => {
  expect(testRequire('../test2')).not.toThrow();
  expect(platform.extension).toBe('native.js');
});

test('should resolve filename.native.js with moduleNameMapper', () => {
  expect(testRequire('test2mapper')).not.toThrow();
  expect(platform.extension).toBe('native.js');
});

test('should resolve filename.js', () => {
  expect(testRequire('../test3')).not.toThrow();
  expect(platform.extension).toBe('js');
});

test('should resolve filename.json', () => {
  expect(testRequire('../test4')).not.toThrow();
  expect(platform.extension).toBe('json');
});

test('should preserve identity for symlinks', () => {
  expect(require('../../../packages/jest-resolve')).toBe(
    require('jest-resolve'),
  );
});

test('should require resolve haste files correctly', () => {
  // We unmock Test5 (they should already be, but to be sure).
  jest.unmock('Test5');

  // Test5 is a standard module, that has a mock (but it is unmocked here).
  expect(require.resolve('Test5')).toBe(require.resolve('../Test5'));

  expect(require('Test5').key).toBe('real');

  // Test6 only exits as a mock; so even when unmocked, we resolve to the mock.
  expect(require.resolve('Test6')).toBe(require.resolve('../__mocks__/Test6'));

  expect(require('Test6').key).toBe('mock');

  // Same as Test6
  expect(require.resolve('Test9')).toBe(
    require.resolve('../__mocks__/Test9.mock'),
  );

  expect(require('Test9').key).toBe('mock');
});

test('should require resolve haste mocks correctly', () => {
  // Now we mock Test5 and Test6.
  jest.mock('Test5');
  jest.mock('Test6');

  // The resolution still points to the real one, but requires the mock.
  expect(require.resolve('Test5')).toBe(require.resolve('../Test5'));

  expect(require('Test5').key).toBe('mock');

  // And Test6 points to the mock, because Test6 does not exist as a module.
  expect(require.resolve('Test6')).toBe(require.resolve('../__mocks__/Test6'));

  expect(require('Test6').key).toBe('mock');

  // Same as Test6
  expect(require.resolve('Test9')).toBe(
    require.resolve('../__mocks__/Test9.mock'),
  );

  expect(require('Test9').key).toBe('mock');
});

test('should throw module not found error if the module has dependencies that cannot be found', () => {
  expect(() => require('Test7')).toThrow(
    expect.objectContaining({
      code: 'MODULE_NOT_FOUND',
      message: dedent`
        Cannot find module 'nope' from 'requiresUnexistingModule.js'

        Require stack:
          requiresUnexistingModule.js
          Test7.js
          __tests__/resolve.test.js\n
        `,
    }),
  );
});

test('should throw module not found error if the module cannot be found', () => {
  expect(() => require('Test8')).toThrow(
    expect.objectContaining({
      code: 'MODULE_NOT_FOUND',
      message: "Cannot find module 'Test8' from '__tests__/resolve.test.js'",
    }),
  );
});
