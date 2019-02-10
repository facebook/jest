/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const tsc = require('typescript');

module.exports = {
  process(src, path) {
    return tsc.transpileModule(src, {
      compilerOptions: {
        inlineSourceMap: true,
        module: tsc.ModuleKind.CommonJS,
        target: 'es5',
      },
      fileName: path,
    }).outputText;
  },
};
