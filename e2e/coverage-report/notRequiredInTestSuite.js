/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

throw new Error(
  `this error should not be a problem because` +
    `this file is never required or executed`
);

// Flow annotations to make sure istanbul can instrument non ES6 source
/* eslint-disable no-unreachable */
module.exports = function(j: string, d: string): string {
  if (j) {
    return d;
  } else {
    return j + d;
  }
};
