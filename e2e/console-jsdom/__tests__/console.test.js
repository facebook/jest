/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-env browser */
'use strict';

beforeEach(() => {
  jest.spyOn(console, 'error');
  console.error.mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

test('can mock console.error calls from jsdom', () => {
  // copied and modified for tests from:
  // https://github.com/facebook/react/blob/46b3c3e4ae0d52565f7ed2344036a22016781ca0/packages/shared/invokeGuardedCallback.js#L62-L147
  const fakeNode = document.createElement('react');

  const evt = document.createEvent('Event');
  const evtType = 'react-invokeguardedcallback';
  function callCallback() {
    fakeNode.removeEventListener(evtType, callCallback, false);
    throw new Error('this is an error in an event callback');
  }

  function onError(event) {}

  window.addEventListener('error', onError);
  fakeNode.addEventListener(evtType, callCallback, false);
  evt.initEvent(evtType, false, false);
  fakeNode.dispatchEvent(evt);
  window.removeEventListener('error', onError);

  expect(console.error).toHaveBeenCalledTimes(1);
});
