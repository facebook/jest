/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const thisFunctionIsCovered = (): null => null;

thisFunctionIsCovered();

const thisFunctionIsNotCovered = (): void => {
  throw new Error('Never Called');
};

module.exports = {
  thisFunctionIsCovered,
  thisFunctionIsNotCovered,
};
