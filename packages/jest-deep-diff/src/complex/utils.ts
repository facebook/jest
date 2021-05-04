/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const getConstructorName = (val: Object): string =>
  (typeof val.constructor === 'function' && val.constructor.name) || 'Object';
