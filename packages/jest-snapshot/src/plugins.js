/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Plugin} from 'types/PrettyFormat';

import prettyFormat from 'pretty-format';
import jestMockSerializer from './mock_serializer';

const {
  DOMCollection,
  DOMElement,
  Immutable,
  ReactElement,
  ReactTestComponent,
  AsymmetricMatcher,
} = prettyFormat.plugins;

let PLUGINS: Array<Plugin> = [
  ReactTestComponent,
  ReactElement,
  DOMElement,
  DOMCollection,
  Immutable,
  jestMockSerializer,
  AsymmetricMatcher,
];

// Prepend to list so the last added is the first tested.
export const addSerializer = (plugin: Plugin) => {
  PLUGINS = [plugin].concat(PLUGINS);
};

export const getSerializers = () => PLUGINS;
