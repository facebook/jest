/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/ban-types-eventually */

import {promisify} from 'util';
import {setFlagsFromString} from 'v8';
import {runInNewContext} from 'vm';
import {isPrimitive} from 'jest-get-type';
import prettyFormat from 'pretty-format';

const tick = promisify(setImmediate);

export default class {
  private _isReferenceBeingHeld: boolean;

  constructor(value: unknown) {
    if (isPrimitive(value)) {
      throw new TypeError(
        [
          'Primitives cannot leak memory.',
          'You passed a ' + typeof value + ': <' + prettyFormat(value) + '>',
        ].join(' '),
      );
    }

    let weak: typeof import('weak-napi');

    try {
      // eslint-disable-next-line import/no-extraneous-dependencies
      weak = require('weak-napi');
    } catch (err) {
      if (!err || err.code !== 'MODULE_NOT_FOUND') {
        throw err;
      }

      throw new Error(
        'The leaking detection mechanism requires the "weak-napi" package to be installed and work. ' +
          'Please install it as a dependency on your main project',
      );
    }

    weak(value as object, () => (this._isReferenceBeingHeld = false));
    this._isReferenceBeingHeld = true;

    // Ensure value is not leaked by the closure created by the "weak" callback.
    value = null;
  }

  async isLeaking(): Promise<boolean> {
    for (let i = 0; i < 2; ++i) {
      this._runGarbageCollector();

      // wait some ticks to allow GC to run properly, see https://github.com/nodejs/node/issues/34636#issuecomment-669366235
      for (let i = 0; i < 10; i++) {
        await tick();
      }
    }

    return this._isReferenceBeingHeld;
  }

  private _runGarbageCollector() {
    const isGarbageCollectorHidden = !global.gc;

    // GC is usually hidden, so we have to expose it before running.
    setFlagsFromString('--expose-gc');
    runInNewContext('gc')();

    // The GC was not initially exposed, so let's hide it again.
    if (isGarbageCollectorHidden) {
      setFlagsFromString('--no-expose-gc');
    }
  }
}
