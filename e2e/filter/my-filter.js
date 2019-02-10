// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

module.exports = function(tests) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        filtered: tests
          .filter(t => t.indexOf('foo') !== -1)
          .map(test => ({message: 'some message', test})),
      });
    }, 100);
  });
};
