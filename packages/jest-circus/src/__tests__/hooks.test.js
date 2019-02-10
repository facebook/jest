/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow strict-local
 */

'use strict';

import {runTest} from '../__mocks__/testUtils';

test('beforeEach is executed before each test in current/child describe blocks', () => {
  const {stdout} = runTest(`
    describe('describe', () => {
      beforeEach(() => console.log('> describe beforeEach'));
      test('one', () => {});
      test('two', () => {});
      describe('2nd level describe', () => {
        beforeEach(() => console.log('> 2nd level describe beforeEach'));
        test('2nd level test', () => {});

        describe('3rd level describe', () => {
          test('3rd level test', () => {});
          test('3rd level test#2', () => {});
        });
      });
    })

    describe('2nd describe', () => {
      beforeEach(() => {
        console.log('> 2nd describe beforeEach that throws')
        throw new Error('alabama');
      });
      test('2nd describe test', () => {});
    })
  `);

  expect(stdout).toMatchSnapshot();
});

test('multiple before each hooks in one describe are executed in the right order', () => {
  const {stdout} = runTest(`
    describe('describe 1', () => {
      beforeEach(() => {
        console.log('before each 1');
      });
      beforeEach(() => {
        console.log('before each 2');
      });

      describe('2nd level describe', () => {
        test('test', () => {});
      });
    });
  `);

  expect(stdout).toMatchSnapshot();
});

test('beforeAll is exectued correctly', () => {
  const {stdout} = runTest(`
    describe('describe 1', () => {
      beforeAll(() => console.log('> beforeAll 1'));
      test('test 1', () => console.log('> test 1'));

      describe('2nd level describe', () => {
        beforeAll(() => console.log('> beforeAll 2'));
        test('test 2', () => console.log('> test 2'));
        test('test 3', () => console.log('> test 3'));
      });
    });
  `);

  expect(stdout).toMatchSnapshot();
});
