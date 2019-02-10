/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+jsinfra
 */
'use strict';

test('resolve, but fail', () =>
  expect(Promise.resolve({foo: 'bar'})).resolves.toEqual({baz: 'bar'}));

test('reject, but fail', () =>
  expect(Promise.reject({foo: 'bar'})).rejects.toEqual({baz: 'bar'}));

test('expect reject', () =>
  expect(Promise.resolve({foo: 'bar'})).rejects.toEqual({foo: 'bar'}));

test('expect resolve', () =>
  expect(Promise.reject({foo: 'bar'})).resolves.toEqual({foo: 'bar'}));

test('timeout', done => {
  setTimeout(done, 50);
}, 5);
