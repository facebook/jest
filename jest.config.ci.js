// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

// Object spread is just node 8
module.exports = Object.assign({}, require('./jest.config'), {
  coverageReporters: ['json'],
  reporters: [
    ['jest-junit', {output: 'reports/junit/js-test-results.xml'}],
    ['jest-silent-reporter', {useDots: true}],
  ],
});
