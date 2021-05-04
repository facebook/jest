/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// adapted from jest/packages/expect/src/__tests__/matchers-toStrictEqual.property.test.ts
import assert from 'assert';
import fc from 'fast-check';
import {onNodeVersions} from '@jest/test-utils';
import diff from '../diff';
import {Kind} from '../types';

// settings for anything arbitrary
const anythingSettings = {
  key: fc.oneof(fc.string(), fc.constantFrom('k1', 'k2', 'k3')),
  maxDepth: 2, // Limit object depth (default: 2)
  maxKeys: 5, // Limit number of keys per object (default: 5)
  withBoxedValues: true,
  // Issue #7975 have to be fixed before enabling the generation of Map
  withMap: false,
  // Issue #7975 have to be fixed before enabling the generation of Set
  withSet: false,
};

// assertion settings
const assertSettings = {
  numRuns: 1000,
};

describe('DiffObject', () => {
  const isDeepEqual = (a, b) => diff(a, b).kind === Kind.EQUAL;

  const safeStrictEquals = (a, b) => {
    try {
      expect(a).toStrictEqual(b);
      return true;
    } catch (err) {
      return false;
    }
  };

  const safeAssertDeepStrictEqual = (a, b) => {
    try {
      assert.deepStrictEqual(a, b);
      return true;
    } catch (err) {
      return false;
    }
  };

  it('should be reflexive', () => {
    fc.assert(
      fc.property(fc.dedup(fc.anything(anythingSettings), 2), ([a, b]) => {
        expect(isDeepEqual(a, b)).toBe(true);
      }),
      assertSettings,
    );
  });

  it('should be symmetric', () => {
    fc.assert(
      fc.property(
        fc.anything(anythingSettings),
        fc.anything(anythingSettings),
        (a, b) => {
          expect(isDeepEqual(a, b)).toBe(isDeepEqual(b, a));
        },
      ),
      assertSettings,
    );
  });

  it('should be equivalent to jest equals', () => {
    fc.assert(
      fc.property(
        fc.anything(anythingSettings),
        fc.anything(anythingSettings),
        (a, b) => {
          expect(isDeepEqual(a, b)).toBe(safeStrictEquals(a, b));
        },
      ),
      assertSettings,
    );
  });

  onNodeVersions('>=9', () => {
    it('should be equivalent to Node deepStrictEqual', () => {
      fc.assert(
        fc.property(
          fc.anything(anythingSettings),
          fc.anything(anythingSettings),
          (a, b) => {
            expect(isDeepEqual(a, b)).toBe(safeAssertDeepStrictEqual(a, b));
          },
        ),
        assertSettings,
      );
    });
  });
});
