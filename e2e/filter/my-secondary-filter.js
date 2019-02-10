// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

module.exports = function(tests) {
  return {
    filtered: tests.filter(t => t.indexOf('foo') !== -1).map(test => ({test})),
  };
};
