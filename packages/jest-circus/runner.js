/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Allow people to use `jest-circus/runner` as a runner.
const runner = require('./build/legacy-code-todo-rewrite/jestAdapter');
module.exports = runner;

exports = require('./build/state');

const run = require('./build/run');
exports.run = run;
