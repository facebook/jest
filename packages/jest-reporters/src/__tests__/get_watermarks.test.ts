/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import getWatermarks from '../get_watermarks';
import {makeProjectConfig} from '../../../../TestUtils';

describe('getWatermarks', () => {
  describe('when a single context is given', () => {
    test(`that watermarks use thresholds as upper target`, () => {
      const context = {
        config: makeProjectConfig({
          coverageThreshold: {
            global: {
              branches: 100,
              functions: 100,
              lines: 100,
              statements: 100,
            },
          },
        }),
      };
      const watermarks = getWatermarks(new Set([context]));

      expect(watermarks).toEqual({
        branches: [expect.any(Number), 100],
        functions: [expect.any(Number), 100],
        lines: [expect.any(Number), 100],
        statements: [expect.any(Number), 100],
      });
    });
  });

  describe('when no contexts are given', () => {
    test(`that watermarks are created always created`, () => {
      const watermarks = getWatermarks(new Set());

      expect(watermarks).toEqual({
        branches: [expect.any(Number), expect.any(Number)],
        functions: [expect.any(Number), expect.any(Number)],
        lines: [expect.any(Number), expect.any(Number)],
        statements: [expect.any(Number), expect.any(Number)],
      });
    });
  });

  describe('when multiple contexts are given', () => {
    test(`that watermarks are created always created`, () => {
      const context = {
        config: makeProjectConfig({
          coverageThreshold: {
            global: {
              branches: 100,
              functions: 100,
              lines: 100,
              statements: 100,
            },
          },
        }),
      };

      const watermarks = getWatermarks(new Set([context, context]));

      expect(watermarks).toEqual({
        branches: [expect.any(Number), expect.any(Number)],
        functions: [expect.any(Number), expect.any(Number)],
        lines: [expect.any(Number), expect.any(Number)],
        statements: [expect.any(Number), expect.any(Number)],
      });
    });
  });
});
