/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

export async function toHaveLengthAsync(
  received: any,
  lengthPromise: Promise<number>
) {
  const length = await lengthPromise;

  const pass = received.length === length;
  const message = pass
    ? () =>
        `Expected value to not have length:\n` +
        `  ${length}\n` +
        `Received:\n` +
        `  ${received}\n` +
        `received.length:\n` +
        `  ${received.length}`
    : () =>
        `Expected value to have length:\n` +
        `  ${length}\n` +
        `Received:\n` +
        `  ${received}\n` +
        `received.length:\n` +
        `  ${received.length}`;

  return {message, pass};
}
