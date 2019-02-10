/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

const circus = require('../index.js');

describe.each([['beforeEach'], ['beforeAll'], ['afterEach'], ['afterAll']])(
  '%s hooks error throwing',
  fn => {
    test.each([
      ['String'],
      [1],
      [[]],
      [{}],
      [Symbol('hello')],
      [true],
      [null],
      [undefined],
    ])(
      `${fn} throws an error when %p is provided as a first argument to it`,
      el => {
        expect(() => {
          circus[fn](el);
        }).toThrowError(
          'Invalid first argument. It must be a callback function.',
        );
      },
    );
  },
);
