/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable sort-keys */

import pluginTester from 'babel-plugin-tester';
import babelPluginJestDeadlines from '..';

pluginTester({
  plugin: babelPluginJestDeadlines,
  pluginName: 'babel-plugin-jest-deadlines',
  tests: {
    'bare function call in statement context': {
      // language=JavaScript
      code: `
        async function foo() {
          await bar();
        }`,
      snapshot: true,
    },
    'transforms an expression': {
      // language=JavaScript
      code: `
        async function foo() {
          return await bar();
        }`,
      snapshot: true,
    },
    'transforms an existing expect': {
      // language=JavaScript
      code: `
        async function foo() {
          await expect(bar()).resolves.toBe("hot potatoes");
        }`,
      snapshot: true,
    },
    'skips double stacking': {
      // language=JavaScript
      code: `
        async function foo() {
          await expect.withinDeadline(bar());
        }`,
      snapshot: true,
    },
    'transforms multiple awaits': {
      // language=JavaScript
      code: `
        async function foo() {
          await bar(1, 2, 3);
          await quux(1, 2, 3);
        }`,
      snapshot: true,
    },
    'transforms await in argument context': {
      // language=JavaScript
      code: `
        async function foo() {
          await bar(1, await quux(), 3);
        }`,
      snapshot: true,
    },
  },
});
