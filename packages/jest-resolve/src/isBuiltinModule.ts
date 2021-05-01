/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import module = require('module');

// TODO: remove when we drop support for node v10 - it is included from node v12
const EXPERIMENTAL_MODULES = ['worker_threads'];

const BUILTIN_MODULES = new Set(
  module.builtinModules.concat(EXPERIMENTAL_MODULES),
);

export default function isBuiltinModule(module: string): boolean {
  return BUILTIN_MODULES.has(module);
}
