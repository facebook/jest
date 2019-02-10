/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const tsc = require('typescript');

module.exports = {
  process(src, path) {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      const result = tsc.transpileModule(src, {
        compilerOptions: {
          module: tsc.ModuleKind.CommonJS,
          sourceMap: true,
        },
        fileName: path,
      });
      return {
        code: result.outputText,
        map: JSON.parse(result.sourceMapText),
      };
    }
    return src;
  },
};
