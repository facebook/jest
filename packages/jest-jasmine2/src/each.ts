/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Environment} from '@jest/types';
// @ts-ignore TODO Remove ignore when jest-each is migrated to TS
import {bind as bindEach} from 'jest-each';

export default (environment: Environment.Environment): void => {
  environment.global.it.each = bindEach(environment.global.it);
  environment.global.fit.each = bindEach(environment.global.fit);
  environment.global.xit.each = bindEach(environment.global.xit);
  environment.global.describe.each = bindEach(
    environment.global.describe,
    false,
  );
  environment.global.xdescribe.each = bindEach(
    environment.global.xdescribe,
    false,
  );
  environment.global.fdescribe.each = bindEach(
    environment.global.fdescribe,
    false,
  );
};
