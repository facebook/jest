/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  CHILD_MESSAGE_CALL,
  CHILD_MESSAGE_END,
  CHILD_MESSAGE_INITIALIZE,
  ChildMessageCall,
  ChildMessageInitialize,
  PARENT_MESSAGE_CLIENT_ERROR,
  PARENT_MESSAGE_ERROR,
  PARENT_MESSAGE_HEARTBEAT,
  PARENT_MESSAGE_OK,
  PARENT_MESSAGE_SETUP_ERROR,
} from '../types';

const DEFAULT_HEARTBEAT_INTERVAL_VALUE = 1_000;

let file: string | null = null;
let setupArgs: Array<unknown> = [];
let initialized = false;
let monitorHeartbeat: NodeJS.Timeout;
let heartbeatIntervalValue: number;

/**
 * This file is a small bootstrapper for workers. It sets up the communication
 * between the worker and the parent process, interpreting parent messages and
 * sending results back.
 *
 * The file loaded will be lazily initialized the first time any of the workers
 * is called. This is done for optimal performance: if the farm is initialized,
 * but no call is made to it, child Node processes will be consuming the least
 * possible amount of memory.
 *
 * If an invalid message is detected, the child will exit (by throwing) with a
 * non-zero exit code.
 */
const messageListener: NodeJS.MessageListener = request => {
  switch (request[0]) {
    case CHILD_MESSAGE_INITIALIZE:
      const init: ChildMessageInitialize = request;
      file = init[2];
      setupArgs = request[3];
      heartbeatIntervalValue = request[4] || DEFAULT_HEARTBEAT_INTERVAL_VALUE;
      monitorHeartbeat = setInterval(() => {
        sendParentMessageHeartbeat();
      }, heartbeatIntervalValue).unref();
      break;

    case CHILD_MESSAGE_CALL:
      const call: ChildMessageCall = request;
      execMethod(call[2], call[3]);
      break;

    case CHILD_MESSAGE_END:
      end();
      break;

    default:
      throw new TypeError(
        'Unexpected request from parent process: ' + request[0],
      );
  }
};
process.on('message', messageListener);

function sendParentMessageHeartbeat() {
  if (process?.send) {
    process.send([PARENT_MESSAGE_HEARTBEAT]);
  }
}

function reportSuccess(result: unknown) {
  if (!process || !process.send) {
    throw new Error('Child can only be used on a forked process');
  }

  process.send([PARENT_MESSAGE_OK, result]);
}

function reportClientError(error: Error) {
  return reportError(error, PARENT_MESSAGE_CLIENT_ERROR);
}

function reportInitializeError(error: Error) {
  return reportError(error, PARENT_MESSAGE_SETUP_ERROR);
}

function reportError(error: Error, type: PARENT_MESSAGE_ERROR) {
  clearInterval(monitorHeartbeat);
  if (!process || !process.send) {
    throw new Error('Child can only be used on a forked process');
  }

  if (error == null) {
    error = new Error('"null" or "undefined" thrown');
  }

  process.send([
    type,
    error.constructor && error.constructor.name,
    error.message,
    error.stack,
    typeof error === 'object' ? {...error} : error,
  ]);
}

function end(): void {
  const main = require(file!);

  if (!main.teardown) {
    exitProcess();

    return;
  }

  execFunction(main.teardown, main, [], exitProcess, exitProcess);
}

function exitProcess(): void {
  // Clean up open handles so the process ideally exits gracefully
  process.removeListener('message', messageListener);
  clearInterval(monitorHeartbeat);
}

function execMethod(method: string, args: Array<unknown>): void {
  const main = require(file!);

  let fn: (...args: Array<unknown>) => unknown;

  if (method === 'default') {
    fn = main.__esModule ? main['default'] : main;
  } else {
    fn = main[method];
  }

  function execHelper() {
    execFunction(fn, main, args, reportSuccess, reportClientError);
  }

  if (initialized || !main.setup) {
    execHelper();

    return;
  }

  initialized = true;

  execFunction(main.setup, main, setupArgs, execHelper, reportInitializeError);
}

const isPromise = (obj: any): obj is PromiseLike<unknown> =>
  !!obj &&
  (typeof obj === 'object' || typeof obj === 'function') &&
  typeof obj.then === 'function';

function execFunction(
  fn: (...args: Array<unknown>) => unknown | Promise<unknown>,
  ctx: unknown,
  args: Array<unknown>,
  onResult: (result: unknown) => void,
  onError: (error: Error) => void,
): void {
  let result;

  try {
    result = fn.apply(ctx, args);
  } catch (err) {
    onError(err);

    return;
  }

  if (isPromise(result)) {
    result.then(onResult, onError);
  } else {
    onResult(result);
  }
}
