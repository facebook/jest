/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// $FlowFixMe: Flow doesn't know about the `module` module
import {builtinModules} from 'module';

// https://github.com/facebook/flow/pull/5160
declare var process: {
  binding(type: string): {},
};

const EXPERIMENTAL_MODULES = ['worker_threads'];

const BUILTIN_MODULES = new Set(
  builtinModules
    ? builtinModules.concat(EXPERIMENTAL_MODULES)
    : Object.keys(process.binding('natives'))
        .filter((module: string) => !/^internal\//.test(module))
        .concat(EXPERIMENTAL_MODULES),
);

export default function isBuiltinModule(module: string): boolean {
  return BUILTIN_MODULES.has(module);
}
