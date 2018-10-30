/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow strict-local
 */

'use strict';

import {testUtils} from '../__mocks__/testUtils';

test('simple test', () => {
  const {stdout} = testUtils(`
    describe('describe', () => {
      beforeEach(() => {});
      afterEach(() => {});
      test('one', () => {});
      test('two', () => {});
    })
  `);

  expect(stdout).toMatchSnapshot();
});

test('failures', () => {
  const {stdout} = testUtils(`
    describe('describe', () => {
      beforeEach(() => {});
      afterEach(() => { throw new Error('banana')});
      test('one', () => { throw new Error('kentucky')});
      test('two', () => {});
    })
  `);

  expect(stdout).toMatchSnapshot();
});
