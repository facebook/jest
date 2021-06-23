/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Config} from '@jest/types';
import expect = require('expect');
import {
  addSerializer,
  toMatchInlineSnapshot,
  toMatchNamedSnapshot,
  toMatchSnapshot,
  toThrowErrorMatchingInlineSnapshot,
  toThrowErrorMatchingSnapshot,
} from 'jest-snapshot';

export type Expect = typeof expect;

export default (config: Pick<Config.GlobalConfig, 'expand'>): Expect => {
  expect.setState({expand: config.expand});
  expect.extend({
    toMatchInlineSnapshot,
    toMatchNamedSnapshot,
    toMatchSnapshot,
    toThrowErrorMatchingInlineSnapshot,
    toThrowErrorMatchingSnapshot,
  });

  expect.addSnapshotSerializer = addSerializer;

  return expect;
};
