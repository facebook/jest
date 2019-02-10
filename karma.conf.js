/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = config => {
  config.set({
    browsers: ['ChromeHeadless'],
    files: ['e2e/browser-support/browserTest.js'],
    frameworks: ['mocha'],
    preprocessors: {
      'e2e/browser-support/browserTest.js': ['webpack'],
    },
    webpack: {
      mode: 'development',
    },
    webpackMiddleware: {
      // webpack-dev-middleware configuration
      // i. e.
      stats: 'errors-only',
    },
  });
};
