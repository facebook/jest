/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import deepCyclicCopy from './deepCyclicCopy';

const BLACKLIST = new Set(['env', 'mainModule', '_events']);

// The "process.env" object has a bunch of particularities: first, it does not
// directly extend from Object; second, it converts any assigned value to a
// string; and third, it is case-insensitive in Windows. We use a proxy here to
// mimic it (see https://nodejs.org/api/process.html#process_process_env).

function createProcessEnv(): NodeJS.ProcessEnv {
  if (typeof Proxy === 'undefined') {
    return deepCyclicCopy(process.env);
  }

  const proto: Object = Object.getPrototypeOf(process.env);
  const real = Object.create(proto);
  const lookup: typeof process.env = {};

  const proxy = new Proxy(real, {
    deleteProperty(_target, key) {
      for (const name in real) {
        if (real.hasOwnProperty(name)) {
          if (typeof key === 'string' && process.platform === 'win32') {
            if (name.toLowerCase() === key.toLowerCase()) {
              delete real[name];
              delete lookup[name.toLowerCase()];
            }
          } else {
            if (key === name) {
              delete real[name];
              delete lookup[name];
            }
          }
        }
      }

      return true;
    },

    get(_target, key) {
      if (typeof key === 'string' && process.platform === 'win32') {
        return lookup[key in proto ? key : key.toLowerCase()];
      } else {
        return real[key];
      }
    },

    set(_target, key, value) {
      const strValue = '' + value;

      if (typeof key === 'string') {
        lookup[key.toLowerCase()] = strValue;
      }

      real[key] = strValue;

      return true;
    },
  });

  return Object.assign(proxy, process.env);
}

export default function() {
  const process = require('process');
  const newProcess = deepCyclicCopy(process, {
    blacklist: BLACKLIST,
    keepPrototype: true,
  });

  newProcess[Symbol.toStringTag] = 'process';

  // Sequentially execute all constructors over the object.
  let proto = process;

  while ((proto = Object.getPrototypeOf(proto))) {
    if (typeof proto.constructor === 'function') {
      proto.constructor.call(newProcess);
    }
  }

  newProcess.env = createProcessEnv();
  newProcess.send = () => {};

  return newProcess;
}
