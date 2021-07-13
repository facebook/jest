/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {PARENT_MESSAGE_CUSTOM} from '../types';

const isWorkerThread: boolean = (() => {
  try {
    // `Require` here to support Node v10
    const {isMainThread, parentPort} =
      require('worker_threads') as typeof import('worker_threads');
    return !isMainThread && parentPort != null;
  } catch {
    return false;
  }
})();

export default function messageParent(
  message: unknown,
  parentProcess = process,
): void {
  if (isWorkerThread) {
    // `Require` here to support Node v10
    const {parentPort} =
      require('worker_threads') as typeof import('worker_threads');
    // ! is safe due to `null` check in `isWorkerThread`
    parentPort!.postMessage([PARENT_MESSAGE_CUSTOM, message]);
  } else if (typeof parentProcess.send === 'function') {
    const m = {stringifiedMessage: require('flatted').stringify(message)};
    // const m = message;
    parentProcess.send([PARENT_MESSAGE_CUSTOM, m]);
  } else {
    throw new Error('"messageParent" can only be used inside a worker');
  }
}
