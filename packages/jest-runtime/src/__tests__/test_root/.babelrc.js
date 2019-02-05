module.exports = {
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
    '@babel/preset-flow',
  ],
};
