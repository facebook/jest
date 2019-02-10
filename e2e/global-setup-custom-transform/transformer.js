// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

const fileToTransform = require.resolve('./index.js');

module.exports = {
  process(src, filename) {
    if (filename === fileToTransform) {
      return src.replace('hello', 'hello, world');
    }

    return src;
  },
};
