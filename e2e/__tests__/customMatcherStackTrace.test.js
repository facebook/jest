/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';
import {extractSummary} from '../Utils';
import {wrap} from 'jest-snapshot-serializer-raw';

test('works with custom matchers', () => {
  const {stderr} = runJest('custom-matcher-stack-trace');

  let {rest} = extractSummary(stderr);

  rest = rest
    .split('\n')
    .filter(line => line.indexOf('at Error (native)') < 0)
    .join('\n');

  expect(wrap(rest)).toMatchSnapshot();
});
