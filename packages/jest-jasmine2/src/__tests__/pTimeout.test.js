/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

jest.useFakeTimers();

import pTimeout from '../pTimeout';

describe('pTimeout', () => {
  it('calls `clearTimeout` and resolves when `promise` resolves.', async () => {
    const onTimeout = jest.fn();
    const promise = Promise.resolve();
    await pTimeout(promise, 1000, clearTimeout, setTimeout, onTimeout);
    expect(setTimeout).toHaveBeenCalled();
    expect(clearTimeout).toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('calls `clearTimeout` and rejects when `promise` rejects.', async () => {
    const onTimeout = jest.fn();
    const promise = Promise.reject();
    try {
      await pTimeout(promise, 1000, clearTimeout, setTimeout, onTimeout);
    } catch (e) {}
    expect(setTimeout).toHaveBeenCalled();
    expect(clearTimeout).toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('calls `onTimeout` on timeout.', async () => {
    const onTimeout = jest.fn();
    // A Promise that never resolves or rejects.
    const promise = new Promise(() => {});
    const timeoutPromise = pTimeout(
      promise,
      1000,
      clearTimeout,
      setTimeout,
      onTimeout,
    );
    jest.runAllTimers();
    await timeoutPromise;
    expect(setTimeout).toHaveBeenCalled();
    expect(onTimeout).toHaveBeenCalled();
  });
});
