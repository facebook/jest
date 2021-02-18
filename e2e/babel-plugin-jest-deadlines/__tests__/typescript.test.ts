/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const sleep = (duration: number) =>
  new Promise(resolve => setTimeout(resolve, duration));

test('exceeded', async () => {
  await sleep(10);
  await sleep(200);
}, 50);
