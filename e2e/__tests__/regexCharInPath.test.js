/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {json as runWithJson} from '../runJest';

describe('Regex Char In Path', () => {
  it('parses paths containing regex chars correctly', () => {
    const {json} = runWithJson('regex-(char-in-path', []);

    expect(json.numTotalTests).toBe(1);
    expect(json.numPassedTests).toBe(1);
  });
});
