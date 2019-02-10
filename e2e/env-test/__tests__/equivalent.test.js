/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

test('Buffer', () => {
  const bufFromArray = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
  expect(bufFromArray.buffer instanceof ArrayBuffer).toBeTruthy();
  const bufFromArrayBuffer = Buffer.from(new ArrayBuffer(6));
  expect(bufFromArrayBuffer.buffer instanceof ArrayBuffer).toBeTruthy();
});
