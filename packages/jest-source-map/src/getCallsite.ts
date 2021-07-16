/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import callsites = require('callsites');
import {readFileSync} from 'graceful-fs';
import {SourceMapConsumer} from 'source-map-sync';
import type {SourceMapRegistry} from './types';

// Copied from https://github.com/rexxars/sourcemap-decorate-callsites/blob/5b9735a156964973a75dc62fd2c7f0c1975458e8/lib/index.js#L113-L158
const addSourceMapConsumer = (
  callsite: callsites.CallSite,
  consumer: SourceMapConsumer,
) => {
  const getLineNumber = callsite.getLineNumber;
  const getColumnNumber = callsite.getColumnNumber;
  let position: ReturnType<typeof consumer.originalPositionFor> | null = null;

  function getPosition() {
    if (!position) {
      position = consumer.originalPositionFor({
        column: getColumnNumber.call(callsite) || -1,
        line: getLineNumber.call(callsite) || -1,
      });
    }
    return position;
  }

  Object.defineProperties(callsite, {
    destroy: {
      value() {
        consumer.destroy();
      },
      writable: false,
    },
    getColumnNumber: {
      value() {
        return getPosition().column || getColumnNumber.call(callsite);
      },
      writable: false,
    },
    getLineNumber: {
      value() {
        return getPosition().line || getLineNumber.call(callsite);
      },
      writable: false,
    },
  });
};

export default (
  level: number,
  sourceMaps?: SourceMapRegistry | null,
): callsites.CallSite => {
  const levelAfterThisCall = level + 1;
  const stack = callsites()[levelAfterThisCall];
  const sourceMapFileName = sourceMaps?.get(stack.getFileName() || '');

  if (sourceMapFileName) {
    try {
      const sourceMap = readFileSync(sourceMapFileName, 'utf8');
      addSourceMapConsumer(stack, new SourceMapConsumer(sourceMap));
    } catch {
      // ignore
    }
  }

  return stack;
};
