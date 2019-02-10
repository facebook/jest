/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
interface NotUsedButTakesUpLines {
  a: number;
  b: string;
}

it('fails', () => {
  // wrapped in arrow function for character offset
  (() => expect(false).toBe(true))();
});
