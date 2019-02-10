/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {Event, State, EventHandler} from 'types/Circus';

import {makeDescribe} from './utils';
import eventHandler from './eventHandler';
import formatNodeAssertErrors from './formatNodeAssertErrors';

const eventHandlers: Array<EventHandler> = [
  eventHandler,
  formatNodeAssertErrors,
];

export const ROOT_DESCRIBE_BLOCK_NAME = 'ROOT_DESCRIBE_BLOCK';
const STATE_SYM = Symbol('JEST_STATE_SYMBOL');

const ROOT_DESCRIBE_BLOCK = makeDescribe(ROOT_DESCRIBE_BLOCK_NAME);
const INITIAL_STATE: State = {
  currentDescribeBlock: ROOT_DESCRIBE_BLOCK,
  currentlyRunningTest: null,
  expand: undefined,
  hasFocusedTests: false, // whether .only has been used on any test/describe
  includeTestLocationInResult: false,
  parentProcess: null,
  rootDescribeBlock: ROOT_DESCRIBE_BLOCK,
  testNamePattern: null,
  testTimeout: 5000,
  unhandledErrors: [],
};

global[STATE_SYM] = INITIAL_STATE;

export const getState = (): State => global[STATE_SYM];
export const setState = (state: State): State => (global[STATE_SYM] = state);

export const dispatch = (event: Event): void => {
  for (const handler of eventHandlers) {
    handler(event, getState());
  }
};

export const addEventHandler = (handler: EventHandler): void => {
  eventHandlers.push(handler);
};
