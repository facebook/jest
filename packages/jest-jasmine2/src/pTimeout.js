/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// A specialized version of `p-timeout` that does not touch globals.
// It does not throw on timeout.
export default function pTimeout(
  promise: Promise<any>,
  ms: number,
  clearTimeout: (timeoutID: number) => void,
  setTimeout: (func: () => void, delay: number) => number,
  onTimeout: () => any,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(onTimeout()), ms);
    promise.then(
      val => {
        clearTimeout(timer);
        resolve(val);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
