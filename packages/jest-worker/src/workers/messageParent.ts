/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {isMainThread, parentPort} from 'worker_threads';
import {PARENT_MESSAGE_CUSTOM} from '../types';

const isWorkerThread = !isMainThread && parentPort;

const messageParent = (
  message: unknown,
  parentProcess: NodeJS.Process = process,
): void => {
  try {
    if (isWorkerThread) {
      const {parentPort} = require('worker_threads');
      parentPort.postMessage([PARENT_MESSAGE_CUSTOM, message]);
    } else if (typeof parentProcess.send === 'function') {
      parentProcess.send([PARENT_MESSAGE_CUSTOM, message]);
    }
  } catch (error) {
    throw new Error('"messageParent" can only be used inside a worker');
  }
};

export default messageParent;