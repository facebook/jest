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

it('prints stack trace pointing to process.exit call', async () => {
  const {stderr} = await runJest('process-exit');

  expect(wrap(stderr)).toMatchSnapshot();
});
