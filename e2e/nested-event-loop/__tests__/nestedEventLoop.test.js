/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment jsdom
 */

/* eslint-env browser */

'use strict';

it('can assert on errors across nested event loops', () => {
  const el = document.createElement('div');
  el.addEventListener('fake', () => {
    throw new Error('This should be caught.');
  });
  let caught = null;
  window.addEventListener('error', e => {
    caught = e.error;
  });
  expect(() => {
    const evt = document.createEvent('Event');
    evt.initEvent('fake', false, false);
    el.dispatchEvent(evt);
    if (caught) {
      throw caught;
    }
  }).toThrow();
});
