/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ProjectConfig} from './Config';
import type {HasteFS, ModuleMap} from './HasteMap';
import type HasteResolver from 'jest-resolve';

export type Context = {|
  config: ProjectConfig,
  hasteFS: HasteFS,
  moduleMap: ModuleMap,
  resolver: HasteResolver,
|};
