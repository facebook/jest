/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/prefer-spread-eventually */

import type {Global} from '@jest/types';
import expect = require('expect');
import {
  addSerializer,
  toMatchInlineSnapshot,
  toMatchNamedSnapshot,
  toMatchSnapshot,
  toThrowErrorMatchingInlineSnapshot,
  toThrowErrorMatchingSnapshot,
} from 'jest-snapshot';
import type {Jasmine, JasmineMatchersObject, RawMatcherFn} from './types';

declare const global: Global.Global;

export default (config: {expand: boolean}): void => {
  global.expect = expect;
  expect.setState({expand: config.expand});
  expect.extend({
    toMatchInlineSnapshot,
    toMatchNamedSnapshot,
    toMatchSnapshot,
    toThrowErrorMatchingInlineSnapshot,
    toThrowErrorMatchingSnapshot,
  });
  expect.addSnapshotSerializer = addSerializer;

  const jasmine = global.jasmine as Jasmine;
  jasmine.anything = expect.anything;
  jasmine.any = expect.any;
  jasmine.objectContaining = expect.objectContaining;
  jasmine.arrayContaining = expect.arrayContaining;
  jasmine.stringMatching = expect.stringMatching;

  jasmine.addMatchers = (jasmineMatchersObject: JasmineMatchersObject) => {
    const jestMatchersObject = Object.create(null);
    Object.keys(jasmineMatchersObject).forEach(name => {
      jestMatchersObject[name] = function (
        this: expect.MatcherState,
        ...args: Array<unknown>
      ): RawMatcherFn {
        // use "expect.extend" if you need to use equality testers (via this.equal)
        const result = jasmineMatchersObject[name](null, null);
        // if there is no 'negativeCompare', both should be handled by `compare`
        const negativeCompare = result.negativeCompare || result.compare;

        return this.isNot
          ? negativeCompare.apply(
              null,
              // @ts-expect-error
              args,
            )
          : result.compare.apply(
              null,
              // @ts-expect-error
              args,
            );
      };
    });

    const expect = global.expect;
    expect.extend(jestMatchersObject);
  };
};
