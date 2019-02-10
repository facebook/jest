// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

const tsc = require('typescript');

module.exports = {
  process(src, path) {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      return tsc.transpile(
        src,
        {
          jsx: tsc.JsxEmit.React,
          module: tsc.ModuleKind.CommonJS,
        },
        path,
        []
      );
    }
    return src;
  },
};
