/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

import {resolve} from 'path';

test('finds a module relative to one of the given paths', () => {
  expect(require.resolve('./mod.js', {paths: ['../dir']})).toEqual(
    resolve(__dirname, '..', 'dir', 'mod.js')
  );
});

test('finds a module without a leading "./" relative to one of the given paths', () => {
  expect(require.resolve('mod.js', {paths: ['../dir']})).toEqual(
    resolve(__dirname, '..', 'dir', 'mod.js')
  );
});

test('finds a node_module above one of the given paths', () => {
  expect(require.resolve('mod', {paths: ['../dir']})).toEqual(
    resolve(__dirname, '..', 'node_modules', 'mod', 'index.js')
  );
});

test('finds a native node module when paths are given', () => {
  expect(require.resolve('fs', {paths: ['../dir']})).toEqual('fs');
});

test('throws an error if the module cannot be found from given paths', () => {
  expect(() => require.resolve('./mod.js', {paths: ['..']})).toThrowError(
    "Cannot resolve module './mod.js' from paths ['..'] from "
  );
});
