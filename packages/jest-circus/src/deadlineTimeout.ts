/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {getState} from './state';

export function deadline(): number {
  const deadline = getState()?.currentlyRunningChildDeadline;
  if (deadline === null) {
    throw new Error('bug! no deadline available');
  }
  return deadline;
}
