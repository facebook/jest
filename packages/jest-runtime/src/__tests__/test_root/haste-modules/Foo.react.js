/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const FooRenderUtil = require('FooRenderUtil');

class Foo {
  render() {
    return `
      <div>
        <div height={${FooRenderUtil.getHeaderHeight()}} />
        <div height={${FooRenderUtil.getBodyHeight()}} />
      </div>
    `;
  }
}

module.exports = Foo;
