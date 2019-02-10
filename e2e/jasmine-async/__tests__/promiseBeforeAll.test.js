/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

describe('promise beforeAll', () => {
  let flag;

  beforeAll(() =>
    new Promise(resolve => {
      process.nextTick(resolve);
    }).then(() => {
      flag = 1;
    })
  );

  beforeAll(() => new Promise(resolve => setTimeout(resolve, 10)), 500);

  // passing tests
  it('runs tests after beforeAll asynchronously completes', () => {
    expect(flag).toBe(1);
  });

  describe('with failing async', () => {
    // failing before hook
    beforeAll(() => new Promise(resolve => setTimeout(resolve, 100)), 11);

    it('fails', () => {});
  });

  describe('done - with error thrown', () => {
    beforeAll(done => {
      throw new Error('fail');
      done(); // eslint-disable-line
    });
    it('fails', () => {});
  });

  describe('done - with error called back', () => {
    beforeAll(done => {
      done(new Error('fail'));
    });
    it('fails', () => {});
  });
});
