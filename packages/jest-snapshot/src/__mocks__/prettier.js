// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

const prettier = jest.requireActual('prettier');

module.exports = {
  format: (text, opts) =>
    prettier.format(text, {
      pluginSearchDirs: [require('path').dirname(require.resolve('prettier'))],
      ...opts,
    }),
  getFileInfo: {sync: () => ({inferredParser: 'babylon'})},
  resolveConfig: {sync: jest.fn()},
  version: prettier.version,
};
