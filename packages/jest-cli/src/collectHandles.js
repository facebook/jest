/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ProjectConfig} from 'types/Config';

import {formatExecError} from 'jest-message-util';
import {ErrorWithStack} from 'jest-util';
import stripAnsi from 'strip-ansi';

function stackIsFromUser(stack) {
  // Either the test file, or something required by it
  if (stack.includes('Runtime.requireModule')) {
    return true;
  }

  // jest-jasmine it or describe call
  if (stack.includes('asyncJestTest') || stack.includes('asyncJestLifecycle')) {
    return true;
  }

  // An async function call from within circus
  if (stack.includes('callAsyncCircusFn')) {
    // jest-circus it or describe call
    return (
      stack.includes('_callCircusTest') || stack.includes('_callCircusHook')
    );
  }

  return false;
}

// Inspired by https://github.com/mafintosh/why-is-node-running/blob/master/index.js
// Extracted as we want to format the result ourselves
export default function collectHandles(): () => Array<Error> {
  const activeHandles: Map<string, Error> = new Map();

  function initHook(asyncId, type) {
    if (type === 'PROMISE' || type === 'TIMERWRAP') {
      return;
    }
    const error = new ErrorWithStack(type, initHook);

    if (stackIsFromUser(error.stack)) {
      activeHandles.set(asyncId, error);
    }
  }

  let hook;

  try {
    // $FlowFixMe: Node core module
    const asyncHooks = require('async_hooks');
    hook = asyncHooks.createHook({
      destroy(asyncId) {
        activeHandles.delete(asyncId);
      },
      init: initHook,
    });

    hook.enable();
  } catch (e) {
    const nodeMajor = Number(process.versions.node.split('.')[0]);
    if (e.code === 'MODULE_NOT_FOUND' && nodeMajor < 8) {
      throw new Error(
        'You can only use --detectOpenHandles on Node 8 and newer.',
      );
    } else {
      throw e;
    }
  }

  return () => {
    hook.disable();

    const result = Array.from(activeHandles.values());
    activeHandles.clear();
    return result;
  };
}

export function formatHandleErrors(
  errors: Array<Error>,
  config: ProjectConfig,
): Array<string> {
  const stacks = new Set();

  return (
    errors
      .map(err =>
        formatExecError(err, config, {noStackTrace: false}, undefined, true),
      )
      // E.g. timeouts might give multiple traces to the same line of code
      // This hairy filtering tries to remove entries with duplicate stack traces
      .filter(handle => {
        const ansiFree: string = stripAnsi(handle);

        const match = ansiFree.match(/\s+at(.*)/);

        if (!match || match.length < 2) {
          return true;
        }

        const stack = ansiFree.substr(ansiFree.indexOf(match[1])).trim();

        if (stacks.has(stack)) {
          return false;
        }

        stacks.add(stack);

        return true;
      })
  );
}
