/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

const path = require('path');
const {normalize} = require('jest-config');
const {buildSnapshotResolver} = require('jest-snapshot');
const DependencyResolver = require('../index');

const maxWorkers = 1;
let dependencyResolver;
let Runtime;
let config;
const cases = {
  fancyCondition: jest.fn(path => path.length > 10),
  testRegex: jest.fn(path => /.test.js$/.test(path)),
};
const filter = path => Object.keys(cases).every(key => cases[key](path));

beforeEach(() => {
  Runtime = require('jest-runtime');
  config = normalize(
    {
      rootDir: '.',
      roots: ['./packages/jest-resolve-dependencies'],
    },
    {},
  ).options;
  return Runtime.createContext(config, {maxWorkers}).then(hasteMap => {
    dependencyResolver = new DependencyResolver(
      hasteMap.resolver,
      hasteMap.hasteFS,
      buildSnapshotResolver(config),
    );
  });
});

test('resolves no dependencies for non-existent path', () => {
  const resolved = dependencyResolver.resolve('/non/existent/path');
  expect(resolved.length).toEqual(0);
});

test('resolves dependencies for existing path', () => {
  const resolved = dependencyResolver.resolve(
    path.resolve(__dirname, '__fixtures__', 'file.js'),
  );
  expect(resolved).toEqual([
    expect.stringContaining('jest-resolve-dependencies'),
    expect.stringContaining('jest-regex-util'),
  ]);
});

test('resolves dependencies for scoped packages', () => {
  const resolved = dependencyResolver.resolve(
    path.resolve(__dirname, '__fixtures__', 'scoped.js'),
  );
  expect(resolved).toEqual([
    expect.stringContaining(path.join('@myorg', 'pkg')),
  ]);
});

test('resolves no inverse dependencies for empty paths set', () => {
  const paths = new Set();
  const resolved = dependencyResolver.resolveInverse(paths, filter);
  expect(resolved.length).toEqual(0);
});

test('resolves no inverse dependencies for set of non-existent paths', () => {
  const paths = new Set(['/non/existent/path', '/another/one']);
  const resolved = dependencyResolver.resolveInverse(paths, filter);
  expect(resolved.length).toEqual(0);
});

test('resolves inverse dependencies for existing path', () => {
  const paths = new Set([path.resolve(__dirname, '__fixtures__/file.js')]);
  const resolved = dependencyResolver.resolveInverse(paths, filter);
  expect(resolved).toEqual([
    expect.stringContaining(
      path.join('__tests__', '__fixtures__', 'file.test.js'),
    ),
  ]);
});

test('resolves inverse dependencies from available snapshot', () => {
  const paths = new Set([
    path.resolve(__dirname, '__fixtures__/file.js'),
    path.resolve(__dirname, '__fixtures__/__snapshots__/related.test.js.snap'),
  ]);
  const resolved = dependencyResolver.resolveInverse(paths, filter);
  expect(resolved).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        path.join('__tests__', '__fixtures__', 'file.test.js'),
      ),
      expect.stringContaining(
        path.join('__tests__', '__fixtures__', 'related.test.js'),
      ),
    ]),
  );
});
