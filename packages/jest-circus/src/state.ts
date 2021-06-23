/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Circus} from '@jest/types';
import eventHandler from './eventHandler';
import formatNodeAssertErrors from './formatNodeAssertErrors';
import {EVENT_HANDLERS, STATE_SYM} from './types';
import {makeDescribe} from './utils';

global[EVENT_HANDLERS] = global[EVENT_HANDLERS] || [
  eventHandler,
  formatNodeAssertErrors,
];

export const ROOT_DESCRIBE_BLOCK_NAME = 'ROOT_DESCRIBE_BLOCK';

const createState = (): Circus.State => {
  const ROOT_DESCRIBE_BLOCK = makeDescribe(ROOT_DESCRIBE_BLOCK_NAME);
  return {
    currentDescribeBlock: ROOT_DESCRIBE_BLOCK,
    currentlyRunningTest: null,
    expand: undefined,
    hasFocusedTests: false,
    hasStarted: false,
    includeTestLocationInResult: false,
    parentProcess: null,
    rootDescribeBlock: ROOT_DESCRIBE_BLOCK,
    testNamePattern: null,
    testTimeout: 5000,
    unhandledErrors: [],
  };
};

export const resetState = (): void => {
  global[STATE_SYM] = createState();
};

resetState();

export const getState = (): Circus.State => global[STATE_SYM];
export const setState = (state: Circus.State): Circus.State =>
  (global[STATE_SYM] = state);

export const dispatch = async (event: Circus.AsyncEvent): Promise<void> => {
  for (const handler of global[EVENT_HANDLERS]) {
    await handler(event, getState());
  }
};

export const dispatchSync = (event: Circus.SyncEvent): void => {
  for (const handler of global[EVENT_HANDLERS]) {
    handler(event, getState());
  }
};

export const addEventHandler = (handler: Circus.EventHandler): void => {
  global[EVENT_HANDLERS].push(handler);
};

export const removeEventHandler = (handler: Circus.EventHandler): void => {
  const index = global[EVENT_HANDLERS].lastIndexOf(handler);
  if (index !== -1) {
    global[EVENT_HANDLERS].splice(index, 1);
  }
};
