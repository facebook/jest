/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

/* globals spyOn */
const subject = {
  func: () => 'foo',
};

test('spyOn', () => {
  spyOn(subject, 'func').and.returnValue('bar');
  expect(subject.func()).toBe('bar');
});
