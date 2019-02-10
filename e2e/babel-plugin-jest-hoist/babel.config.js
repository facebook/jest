// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

module.exports = {
  overrides: [
    {
      presets: ['@babel/preset-flow'],
      test: '**/*.js',
    },
    {
      presets: ['@babel/preset-typescript'],
      test: '**/*.ts',
    },
  ],
  plugins: ['jest-hoist'],
  presets: ['@babel/preset-env'],
};
