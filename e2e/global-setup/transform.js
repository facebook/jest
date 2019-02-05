// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
const babelJest = require('babel-jest');

/* use higher-level babel.config.js */

module.exports = babelJest.createTransformer({
  rootMode: 'upward',
});
