/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

describe('Correct beforeEach order', () => {
  it('ensures the correct order for beforeEach', () => {
    const result = runJest('before-each-queue');
    expect(wrap(result.stdout.replace(/\\/g, '/'))).toMatchSnapshot();
  });
});
