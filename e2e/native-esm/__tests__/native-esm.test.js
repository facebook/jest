/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// the point here is that it's the node core module
// eslint-disable-next-line no-restricted-imports
import {readFileSync} from 'fs';
import {createRequire} from 'module';
import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';
import {jest as jestObject} from '@jest/globals';
import staticImportedStatefulFromCjs from '../fromCjs.mjs';
import {double} from '../index';
import defaultFromCjs, {half, namedFunction} from '../namedExport.cjs';
// eslint-disable-next-line import/named
import {bag} from '../namespaceExport.js';
import staticImportedStateful from '../stateful.mjs';
import staticImportedStatefulWithQuery from '../stateful.mjs?query=1';
import staticImportedStatefulWithAnotherQuery from '../stateful.mjs?query=2';

test('should have correct import.meta', () => {
  expect(typeof require).toBe('undefined');
  expect(typeof jest).toBe('undefined');
  expect(import.meta).toEqual({
    url: expect.any(String),
  });
  expect(
    import.meta.url.endsWith('/e2e/native-esm/__tests__/native-esm.test.js'),
  ).toBe(true);
});

test('should double stuff', () => {
  expect(double(1)).toBe(2);
});

test('should support importing node core modules', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = resolve(dir, '../package.json');

  expect(JSON.parse(readFileSync(packageJsonPath, 'utf8'))).toEqual({
    jest: {
      testEnvironment: 'node',
      transform: {},
    },
    type: 'module',
  });
});

test('should support importing node core modules dynamically', async () => {
  // it's important that this module has _not_ been imported at the top level
  const assert = await import('assert');

  expect(typeof assert.strictEqual).toBe('function');
});

test('dynamic import should work', async () => {
  const {double: importedDouble} = await import('../index');

  expect(importedDouble).toBe(double);
  expect(importedDouble(1)).toBe(2);
});

test('import cjs', async () => {
  const {default: half} = await import('../commonjs.cjs');

  expect(half(4)).toBe(2);
});

test('import esm from cjs', async () => {
  const {default: halfPromise} = await import('../fromEsm.cjs');
  expect(await halfPromise(1)).toBe(2);
});

test('require(cjs) and import(cjs) should share caches', async () => {
  const require = createRequire(import.meta.url);

  const {default: importedStateful} = await import('../stateful.cjs');
  const requiredStateful = require('../stateful.cjs');

  expect(importedStateful()).toBe(1);
  expect(importedStateful()).toBe(2);
  expect(requiredStateful()).toBe(3);
  expect(importedStateful()).toBe(4);
  expect(requiredStateful()).toBe(5);
  expect(requiredStateful()).toBe(6);
});

test('import from mjs and import(mjs) should share caches', async () => {
  const {default: importedStateful} = await import('../stateful.mjs');

  expect(importedStateful()).toBe(1);
  expect(importedStateful()).toBe(2);
  expect(staticImportedStateful()).toBe(3);
  expect(importedStateful()).toBe(4);
  expect(staticImportedStateful()).toBe(5);
  expect(staticImportedStateful()).toBe(6);
});

test('import cjs via import statement', () => {
  expect(staticImportedStatefulFromCjs(4)).toBe(2);
});

test('handle unlinked dynamic imports', async () => {
  const {double: deepDouble} = await import('../dynamicImport');

  expect(deepDouble).toBe(double);

  expect(deepDouble(4)).toBe(8);
});

test('can import `jest` object', () => {
  expect(jestObject).toBeDefined();
});

test('handle dynamic imports of the same module in parallel', async () => {
  const [{double: first}, {double: second}] = await Promise.all([
    import('../anotherDynamicImport.js'),
    import('../anotherDynamicImport.js'),
  ]);

  expect(first).toBe(second);
  expect(first(2)).toBe(4);
});

test('varies module cache by query', () => {
  expect(staticImportedStatefulWithQuery).not.toBe(
    staticImportedStatefulWithAnotherQuery,
  );

  expect(staticImportedStatefulWithQuery()).toBe(1);
  expect(staticImportedStatefulWithQuery()).toBe(2);
  expect(staticImportedStatefulWithAnotherQuery()).toBe(1);
  expect(staticImportedStatefulWithQuery()).toBe(3);
  expect(staticImportedStatefulWithAnotherQuery()).toBe(2);
  expect(staticImportedStatefulWithAnotherQuery()).toBe(3);
});

test('supports named imports from CJS', () => {
  expect(half(4)).toBe(2);
  expect(namedFunction()).toBe('hello from a named CJS function!');
  expect(defaultFromCjs.default()).toBe('"default" export');

  expect(Object.keys(defaultFromCjs)).toEqual([
    'half',
    'namedFunction',
    'default',
  ]);
});

test('supports file urls as imports', async () => {
  const dynamic = await import(new URL('../stateful.mjs', import.meta.url));

  expect(dynamic.default).toBe(staticImportedStateful);
});

test('namespace export', () => {
  expect(bag.double).toBe(double);
});

test('handle circular dependency', async () => {
  const moduleA = (await import('../circularDependentA.mjs')).default;
  expect(moduleA.id).toBe('circularDependentA');
  expect(moduleA.moduleB.id).toBe('circularDependentB');
  expect(moduleA.moduleB.moduleA).toBe(moduleA);
});

test('require of ESM should throw correct error', () => {
  const require = createRequire(import.meta.url);

  expect(() => require('../fromCjs.mjs')).toThrow(
    expect.objectContaining({
      code: 'ERR_REQUIRE_ESM',
      message: expect.stringContaining('Must use import to load ES Module'),
    }),
  );
});

test('can mock module', async () => {
  jestObject.mockModule('../mockedModule.mjs', () => ({foo: 'bar'}), {
    virtual: true,
  });

  const importedMock = await import('../mockedModule.mjs');

  expect(Object.keys(importedMock)).toEqual(['foo']);
  expect(importedMock.foo).toEqual('bar');
});
