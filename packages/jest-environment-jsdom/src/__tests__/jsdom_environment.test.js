/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const JSDomEnvironment = jest.requireActual('../');

describe('JSDomEnvironment', () => {
  it('should configure setTimeout/setInterval to use the browser api', () => {
    const env1 = new JSDomEnvironment({});

    env1.fakeTimers.useFakeTimers();

    const timer1 = env1.global.setTimeout(() => {}, 0);
    const timer2 = env1.global.setInterval(() => {}, 0);

    [timer1, timer2].forEach(timer => {
      expect(typeof timer).toBe('number');
    });
  });
});
