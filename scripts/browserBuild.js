/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const path = require('path');
const webpack = require('webpack');
const camelCase = require('camelcase');
const rimraf = require('rimraf');

const transformOptions = require('../babel.config.js');

const babelEs5Options = {
  // Dont load other config files
  babelrc: false,
  configFile: false,
  overrides: transformOptions.overrides,
  plugins: ['@babel/plugin-transform-strict-mode'],
  presets: [
    [
      '@babel/preset-env',
      {
        // Required for Webpack
        modules: 'cjs',
        shippedProposals: true,
        // Target ES5
        targets: 'IE 11',
      },
    ],
  ],
};

function browserBuild(pkgName, entryPath, destination) {
  rimraf.sync(destination);

  return new Promise((resolve, reject) => {
    webpack(
      /* eslint-disable sort-keys */
      {
        mode: 'development',
        devtool: 'source-map',
        entry: entryPath,
        output: {
          path: path.dirname(destination),
          library: camelCase(pkgName),
          libraryTarget: 'umd',
          filename: path.basename(destination),
        },
        module: {
          rules: [
            {
              test: /\.[jt]sx?$/,
              loader: 'babel-loader',
              options: babelEs5Options,
            },
          ],
        },
        resolve: {
          alias: {
            chalk: path.resolve(
              __dirname,
              '../packages/expect/build/fakeChalk.js'
            ),
          },
          extensions: ['.js', '.json', '.ts'],
        },
        node: {
          fs: 'empty',
        },
      },
      /* eslint-enable */
      (err, stats) => {
        if (err || stats.hasErrors()) {
          reject(err || stats.toString());
          return;
        }
        resolve(stats);
      }
    );
  });
}

module.exports = browserBuild;
