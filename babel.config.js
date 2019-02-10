// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

module.exports = {
  babelrcRoots: ['examples/*'],
  overrides: [
    {
      presets: ['@babel/preset-flow'],
      test: '**/*.js',
    },
    {
      plugins: [
        require.resolve(
          './scripts/babel-plugin-jest-replace-ts-export-assignment.js'
        ),
      ],
      presets: ['@babel/preset-typescript'],
      test: /\.tsx?$/,
    },
  ],
  plugins: [
    ['@babel/plugin-transform-modules-commonjs', {allowTopLevelThis: true}],
    '@babel/plugin-transform-strict-mode',
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        shippedProposals: true,
        targets: {node: 6},
      },
    ],
  ],
};
