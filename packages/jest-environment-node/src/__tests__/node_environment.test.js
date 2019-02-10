/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const NodeEnvironment = jest.requireActual('../');

describe('NodeEnvironment', () => {
  it('uses a copy of the process object', () => {
    const env1 = new NodeEnvironment({});
    const env2 = new NodeEnvironment({});

    expect(env1.global.process).not.toBe(env2.global.process);
  });

  it('exposes process.on', () => {
    const env1 = new NodeEnvironment({});

    expect(env1.global.process.on).not.toBe(null);
  });

  it('exposes global.global', () => {
    const env1 = new NodeEnvironment({});

    expect(env1.global.global).toBe(env1.global);
  });

  it('should configure setTimeout/setInterval to use the node api', () => {
    const env1 = new NodeEnvironment({});

    env1.fakeTimers.useFakeTimers();

    const timer1 = env1.global.setTimeout(() => {}, 0);
    const timer2 = env1.global.setInterval(() => {}, 0);

    [timer1, timer2].forEach(timer => {
      expect(timer.id).not.toBeUndefined();
      expect(typeof timer.ref).toBe('function');
      expect(typeof timer.unref).toBe('function');
    });
  });
});
