/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const vm = require('vm');
const path = require('path');
const fs = require('fs');
const filePath = path.resolve(__dirname, '../package/vmscript.js');

test('extract coverage', () => {
  const content = fs.readFileSync(filePath, {encoding: 'utf8'});

  const case1 = vm.runInNewContext(
    content,
    {
      inputObject: {
        number: 0,
      },
    },
    {
      filename: filePath,
    },
  );

  const case2 = vm.runInNewContext(
    content,
    {
      inputObject: {
        number: 7,
      },
    },
    {
      filename: filePath,
    },
  );

  expect(case1).toBe(false);
  expect(case2).toBe(true);
});
