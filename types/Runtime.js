/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

import type {HasteMap as HasteMapObject} from './HasteMap';
import type HasteMap from '../packages/jest-haste-map/src';
import type HasteResolver from '../packages/jest-resolve/src';

export type HasteResolverContext = {
  instance: HasteMap,
  moduleMap: HasteMapObject,
  resolver: HasteResolver,
};
