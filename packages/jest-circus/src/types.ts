/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Used as type
import type {Circus} from '@jest/types';
import expect = require('expect');

export const STATE_SYM = Symbol(
  'JEST_STATE_SYMBOL',
) as unknown as 'STATE_SYM_SYMBOL';
export const RETRY_TIMES = Symbol.for(
  'RETRY_TIMES',
) as unknown as 'RETRY_TIMES_SYMBOL';
// To pass this value from Runtime object to state we need to use global[sym]
export const TEST_TIMEOUT_SYMBOL = Symbol.for(
  'TEST_TIMEOUT_SYMBOL',
) as unknown as 'TEST_TIMEOUT_SYMBOL';
export const EVENT_HANDLERS = Symbol.for(
  'EVENT_HANDLERS',
) as unknown as 'EVENT_HANDLERS';

declare global {
  module NodeJS {
    interface Global {
      STATE_SYM_SYMBOL: Circus.State;
      RETRY_TIMES_SYMBOL: string;
      TEST_TIMEOUT_SYMBOL: number;
      EVENT_HANDLERS: Array<Circus.EventHandler>;
      expect: typeof expect;
    }
  }
}
