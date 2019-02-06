/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */
'use strict';

import addInstanceOfAlias from '../addInstanceOfAlias';

describe('addInstanceOfAlias', () => {
  let Color;
  let Purple;
  let OtherPurple;
  let Black;
  beforeEach(() => {
    Color = class Color {};
    Purple = class Purple extends Color {};
    OtherPurple = class OtherPurple extends Color {};
    Black = class Black extends Color {};
  });

  if (typeof Symbol !== 'undefined' && Symbol.hasInstance != null) {
    describe('when Symbol.hasInstance is available (node 6.10.0+)', () => {
      it('adds the given alias to the target as an object to include in an instanceof call', () => {
        const purple = new Purple();
        expect(purple instanceof OtherPurple).toBe(false);
        addInstanceOfAlias(OtherPurple, Purple);
        expect(purple instanceof OtherPurple).toBe(true);
      });

      it('preserves the prior instanceof lookup', () => {
        const purple = new Purple();
        addInstanceOfAlias(OtherPurple, Purple);
        expect(purple instanceof Purple).toBe(true);
        expect(purple instanceof Color).toBe(true);
        expect(purple instanceof Black).toBe(false);
      });

      describe('when using the same value for the target and alias', () => {
        it('throws an error', () => {
          expect(() => {
            addInstanceOfAlias(Purple, Purple);
          }).toThrow(Error);
        });
      });
    });
  } else {
    describe('when Symbol.hasInstance is not available (node <6.10.0)', () => {
      it("does nothing (but doesn't throw an error)", () => {
        const purple = new Purple();
        expect(purple instanceof OtherPurple).toBe(false);
        addInstanceOfAlias(OtherPurple, Purple);
        expect(purple instanceof OtherPurple).toBe(false);
      });
    });
  }
});
