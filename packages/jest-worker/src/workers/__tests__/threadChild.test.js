/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

jest.mock('worker_threads', () => {
  const EventEmitter = require('events');
  const thread = new EventEmitter();
  thread.postMessage = jest.fn();

  return {
    isMainThread: false,
    parentPort: thread,
  };
});
let thread;

const mockError = new TypeError('Booo');
const mockExtendedError = new ReferenceError('Booo extended');
const uninitializedParam = {};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

import {
  CHILD_MESSAGE_INITIALIZE,
  CHILD_MESSAGE_CALL,
  CHILD_MESSAGE_END,
  PARENT_MESSAGE_OK,
  PARENT_MESSAGE_CLIENT_ERROR,
} from '../../types';

let ended;
let mockCount;
let initializeParm = uninitializedParam;

beforeEach(() => {
  mockCount = 0;
  ended = false;

  jest.mock(
    '../my-fancy-worker',
    () => {
      mockCount++;

      return {
        fooPromiseThrows() {
          return new Promise((resolve, reject) => {
            setTimeout(() => reject(mockError), 5);
          });
        },

        fooPromiseWorks() {
          return new Promise((resolve, reject) => {
            setTimeout(() => resolve(1989), 5);
          });
        },

        fooThrows() {
          throw mockError;
        },

        fooThrowsANumber() {
          // eslint-disable-next-line no-throw-literal
          throw 412;
        },

        fooThrowsAnErrorWithExtraProperties() {
          mockExtendedError.baz = 123;
          mockExtendedError.qux = 456;

          throw mockExtendedError;
        },

        fooThrowsNull() {
          // eslint-disable-next-line no-throw-literal
          throw null;
        },

        fooWorks() {
          return 1989;
        },

        setup(param) {
          initializeParm = param;
        },

        teardown() {
          ended = true;
        },
      };
    },
    {virtual: true},
  );

  jest.mock(
    '../my-fancy-standalone-worker',
    () => jest.fn().mockImplementation(() => 12345),
    {virtual: true},
  );

  // This mock emulates a transpiled Babel module that carries a default export
  // that corresponds to a method.
  jest.mock(
    '../my-fancy-babel-worker',
    () => ({
      __esModule: true,
      default: jest.fn().mockImplementation(() => 67890),
    }),
    {virtual: true},
  );

  thread = require('worker_threads').parentPort;

  process.exit = jest.fn();

  // Require the child!
  require('../threadChild');
});

beforeEach(() => {
  process.exit.mockClear();
  thread.postMessage.mockClear();
});

afterEach(() => {
  jest.resetModules();

  thread.removeAllListeners('message');
});

it('lazily requires the file', () => {
  expect(mockCount).toBe(0);

  thread.emit('message', [
    CHILD_MESSAGE_INITIALIZE,
    true, // Not really used here, but for flow type purity.
    './my-fancy-worker',
  ]);

  expect(mockCount).toBe(0);
  expect(initializeParm).toBe(uninitializedParam); // Not called yet.

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'fooWorks',
    [],
  ]);

  expect(mockCount).toBe(1);
  expect(initializeParm).toBe(undefined);
});

it('calls initialize with the correct arguments', () => {
  expect(mockCount).toBe(0);

  thread.emit('message', [
    CHILD_MESSAGE_INITIALIZE,
    true, // Not really used here, but for flow type purity.
    './my-fancy-worker',
    ['foo'], // Pass empty initialize params so the initialize method is called.
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'fooWorks',
    [],
  ]);

  expect(initializeParm).toBe('foo');
});

it('returns results immediately when function is synchronous', () => {
  thread.send = jest.fn();

  thread.emit('message', [
    CHILD_MESSAGE_INITIALIZE,
    true, // Not really used here, but for flow type purity.
    './my-fancy-worker',
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'fooWorks',
    [],
  ]);

  expect(thread.postMessage.mock.calls[0][0]).toEqual([
    PARENT_MESSAGE_OK,
    1989,
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'fooThrows',
    [],
  ]);

  expect(thread.postMessage.mock.calls[1][0]).toEqual([
    PARENT_MESSAGE_CLIENT_ERROR,
    'TypeError',
    'Booo',
    mockError.stack,
    {},
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'fooThrowsANumber',
    [],
  ]);

  expect(thread.postMessage.mock.calls[2][0]).toEqual([
    PARENT_MESSAGE_CLIENT_ERROR,
    'Number',
    void 0,
    void 0,
    412,
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'fooThrowsAnErrorWithExtraProperties',
    [],
  ]);

  expect(thread.postMessage.mock.calls[3][0]).toEqual([
    PARENT_MESSAGE_CLIENT_ERROR,
    'ReferenceError',
    'Booo extended',
    mockExtendedError.stack,
    {baz: 123, qux: 456},
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'fooThrowsNull',
    [],
  ]);

  expect(thread.postMessage.mock.calls[4][0][0]).toBe(
    PARENT_MESSAGE_CLIENT_ERROR,
  );
  expect(thread.postMessage.mock.calls[4][0][1]).toBe('Error');
  expect(thread.postMessage.mock.calls[4][0][2]).toEqual(
    '"null" or "undefined" thrown',
  );

  expect(thread.postMessage).toHaveBeenCalledTimes(5);
});

it('returns results when it gets resolved if function is asynchronous', async () => {
  jest.useRealTimers();

  thread.emit('message', [
    CHILD_MESSAGE_INITIALIZE,
    true, // Not really used here, but for flow type purity.
    './my-fancy-worker',
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'fooPromiseWorks',
    [],
  ]);

  await sleep(10);

  expect(thread.postMessage.mock.calls[0][0]).toEqual([
    PARENT_MESSAGE_OK,
    1989,
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'fooPromiseThrows',
    [],
  ]);

  await sleep(10);

  expect(thread.postMessage.mock.calls[1][0]).toEqual([
    PARENT_MESSAGE_CLIENT_ERROR,
    'TypeError',
    'Booo',
    mockError.stack,
    {},
  ]);

  expect(thread.postMessage).toHaveBeenCalledTimes(2);
});

it('calls the main module if the method call is "default"', () => {
  thread.emit('message', [
    CHILD_MESSAGE_INITIALIZE,
    true, // Not really used here, but for flow type purity.
    './my-fancy-standalone-worker',
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'default',
    [],
  ]);

  expect(thread.postMessage.mock.calls[0][0]).toEqual([
    PARENT_MESSAGE_OK,
    12345,
  ]);
});

it('calls the main export if the method call is "default" and it is a Babel transpiled one', () => {
  thread.emit('message', [
    CHILD_MESSAGE_INITIALIZE,
    true, // Not really used here, but for flow type purity.
    './my-fancy-babel-worker',
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_CALL,
    true, // Not really used here, but for flow type purity.
    'default',
    [],
  ]);

  expect(thread.postMessage.mock.calls[0][0]).toEqual([
    PARENT_MESSAGE_OK,
    67890,
  ]);
});

it('finishes the process with exit code 0 if requested', () => {
  thread.emit('message', [
    CHILD_MESSAGE_INITIALIZE,
    true, // Not really used here, but for flow type purity.
    './my-fancy-worker',
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_END,
    true, // Not really used here, but for flow type purity.
  ]);

  expect(process.exit).toHaveBeenCalledWith(0);
});

it('calls the teardown method ', () => {
  thread.emit('message', [
    CHILD_MESSAGE_INITIALIZE,
    true, // Not really used here, but for flow type purity.
    './my-fancy-worker',
  ]);

  thread.emit('message', [
    CHILD_MESSAGE_END,
    true, // Not really used here, but for flow type purity.
  ]);

  expect(ended).toBe(true);
});

it('throws if an invalid message is detected', () => {
  // Type 27 does not exist.
  expect(() => {
    thread.emit('message', [27]);
  }).toThrow(TypeError);
});

it('throws if child is not forked', () => {
  delete thread.postMessage;

  thread.emit('message', [
    CHILD_MESSAGE_INITIALIZE,
    true, // Not really used here, but for flow type purity.
    './my-fancy-worker',
  ]);

  expect(() => {
    thread.emit('message', [
      CHILD_MESSAGE_CALL,
      true, // Not really used here, but for flow type purity.
      'fooWorks',
      [],
    ]);
  }).toThrow();

  expect(() => {
    thread.emit('message', [
      CHILD_MESSAGE_CALL,
      true, // Not really used here, but for flow type purity.
      'fooThrows',
      [],
    ]);
  }).toThrow();
});
