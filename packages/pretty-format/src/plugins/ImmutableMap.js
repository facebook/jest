/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

'use strict';

import type {Colors, Indent, Options, Print, Plugin} from '../types.js';

const printImmutable = require('./lib/printImmutable');

const IS_MAP = '@@__IMMUTABLE_MAP__@@';
const IS_ORDERED = '@@__IMMUTABLE_ORDERED__@@';
const isMap = (maybeMap: any) => !!maybeMap[IS_MAP];
const isNotOrdered = (maybeOrdered: any) => !maybeOrdered[IS_ORDERED];

const test = (maybeMap: any) => 
  !!(maybeMap && isMap(maybeMap) && isNotOrdered(maybeMap));

const print = (
  val: any,
  print: Print,
  indent: Indent,
  opts: Options,
  colors: Colors,
) => printImmutable(val, print, indent, opts, colors, 'Map', true);

module.exports = ({print, test}: Plugin);
