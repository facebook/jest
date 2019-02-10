/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
let current = 0;

for (let t = 0; t < 10; ++t) {
  it.concurrent(`#${t}`, () => {
    current += 1;

    if (current > 5) {
      current -= 1;
      throw new Error(`Too many processes ran simultaneously`);
    } else {
      return sleep(20).then(() => {
        current -= 1;
      });
    }
  });
}
