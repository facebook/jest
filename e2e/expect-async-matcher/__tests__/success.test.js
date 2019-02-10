/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

import {toHaveLengthAsync} from '../matchers';

expect.extend({
  toHaveLengthAsync,
});

it('works with expected non promise values', async () => {
  await (expect([1]): any).toHaveLengthAsync(Promise.resolve(1));
});

it('works with expected non promise values and not', async () => {
  await (expect([1, 2]): any).not.toHaveLengthAsync(Promise.resolve(1));
});

it('works with expected promise values', async () => {
  await (expect(Promise.resolve([1])).resolves: any).toHaveLengthAsync(
    Promise.resolve(1)
  );
});

it('works with expected promise values and not', async () => {
  await (expect(Promise.resolve([1, 2])).resolves.not: any).toHaveLengthAsync(
    Promise.resolve(1)
  );
});
