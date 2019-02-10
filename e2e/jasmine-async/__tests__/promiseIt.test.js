/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

describe('promise it', () => {
  beforeEach(() => {
    this.someContextValue = 'value';
  });

  // passing tests
  it('passes a sync test', () => {
    expect(1).toBe(1);
  });

  it('waits for promise to be resolved', () => Promise.resolve());

  it('works with done', done => {
    done();
  });

  it('works with async done', done => {
    setTimeout(done, 1);
  });

  it('is bound to context object', () =>
    new Promise(resolve => {
      if (this.someContextValue !== 'value') {
        throw new Error(
          'expected this.someContextValue to be set: ' + this.someContextValue
        );
      }
      resolve();
    }));

  // failing tests
  it('fails if promise is rejected', () =>
    Promise.reject(new Error('rejected promise returned')));

  it('works with done.fail', done => {
    done.fail(new Error('done.fail was called'));
  });

  it('works with done(error)', done => {
    done(new Error('done was called with error'));
  });

  it('fails if failed expectation with done', done => {
    expect(true).toEqual(false);
    done();
  });

  it('fails if failed expectation with done - async', done => {
    setTimeout(() => {
      expect(true).toEqual(false);
      done();
    }, 1);
  });

  it('fails with thrown error with done - sync', done => {
    throw new Error('sync fail');
    done(); // eslint-disable-line
  });

  it('fails with thrown error with done - async', done => {
    setTimeout(() => {
      throw new Error('async fail');
      done(); // eslint-disable-line
    }, 1);
  });

  // I wish it was possible to catch this but I do not see a way.
  // Currently both jest and mocha will pass this test.
  it.skip('fails with thrown error - async', () => {
    setTimeout(() => {
      throw new Error('async fail - no done');
    }, 1);
  });

  it('fails a sync test', () => {
    expect('sync').toBe('failed');
  });

  it(
    'succeeds if the test finishes in time',
    () => new Promise(resolve => setTimeout(resolve, 10)),
    250
  );

  // failing tests
  it(
    'fails if a custom timeout is exceeded',
    () => new Promise(resolve => setTimeout(resolve, 100)),
    10
  );
});
