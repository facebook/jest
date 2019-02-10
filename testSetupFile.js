/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const jasmineReporters = require('jasmine-reporters');

// Some of the `jest-runtime` tests are very slow and cause
// timeouts on travis
jest.setTimeout(70000);

if (global.jasmine && process.env.APPVEYOR_API_URL) {
  // Running on AppVeyor, add the custom reporter.
  jasmine.getEnv().addReporter(new jasmineReporters.AppVeyorReporter());
}
