/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function addOne(inputNumber) {
  return ++inputNumber;
}

function isEven(inputNumber) {
  if (inputNumber % 2 === 0) {
    return true;
  } else {
    return false;
  }
}

/* global inputObject */
if (inputObject.number / 1 === inputObject.number) {
  isEven(addOne(inputObject.number));
}
