/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import Suite from '../jasmine/Suite';

describe('Suite', () => {
  let suite;

  beforeEach(() => {
    suite = new Suite({
      getTestPath: () => '',
    });
  });

  it("doesn't throw on addExpectationResult when there are no children", () => {
    expect(() => {
      suite.addExpectationResult();
    }).not.toThrow();
  });
});
