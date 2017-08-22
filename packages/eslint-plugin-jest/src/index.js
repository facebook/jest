/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

import noDisabledTests from './rules/no_disabled_tests';
import noFocusedTests from './rules/no_focused_tests';
import noIdenticalTitle from './rules/no_identical_title';
import validExpect from './rules/valid_expect';

module.exports = {
  configs: {
    recommended: {
      rules: {
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/valid-expect': 'error',
      },
    },
  },
  environments: {
    globals: {
      globals: {
        afterAll: false,
        afterEach: false,
        beforeAll: false,
        beforeEach: false,
        describe: false,
        expect: false,
        fit: false,
        it: false,
        jasmine: false,
        jest: false,
        pit: false,
        require: false,
        test: false,
        xafterAll: false,
        xafterEach: false,
        xbeforeAll: false,
        xbeforeEach: false,
        xdescribe: false,
        xit: false,
        xtest: false,
      },
    },
  },
  rules: {
    'no-disabled-tests': noDisabledTests,
    'no-focused-tests': noFocusedTests,
    'no-identical-title': noIdenticalTitle,
    'valid-expect': validExpect,
  },
};
