/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
var expect = require('../../packages/expect/build-es5/index.js');
var mock = require('../../packages/jest-mock/build-es5/index.js');
var prettyFormat = require('../../packages/pretty-format/build-es5/index.js');

describe('es5 builds in browser', function() {
  it('runs assertions', function() {
    expect(1).toBe(1);
  });

  it('runs mocks', function() {
    var someMockFunction = mock.fn();
    expect(someMockFunction).not.toHaveBeenCalled();
    someMockFunction();
    expect(someMockFunction).toHaveBeenCalledTimes(1);
  });

  it('pretty formats a string', function() {
    expect(prettyFormat('obj')).toBe('"obj"');
  });
});
