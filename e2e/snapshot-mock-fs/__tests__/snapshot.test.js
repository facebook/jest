/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+jsinfra
 */
'use strict';

const fs = require('fs');

fs.writeFileSync = jest.fn();

test('snapshot', () => {
  const thing = {foo: 'bar'};

  expect(thing).toMatchSnapshot();
});
