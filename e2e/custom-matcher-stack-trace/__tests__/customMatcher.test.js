/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

function toCustomMatch(callback, expectation) {
  const actual = callback();

  if (actual !== expectation) {
    return {
      message: () => `Expected "${expectation}" but got "${actual}"`,
      pass: false,
    };
  } else {
    return {pass: true};
  }
}

expect.extend({
  toCustomMatch,
});

describe('Custom matcher', () => {
  it('passes', () => {
    // This expectation should pass
    expect(() => 'foo').toCustomMatch('foo');
  });

  it('fails', () => {
    expect(() => {
      // This expectation should fail,
      // Which is why it's wrapped in a .toThrow() block.
      expect(() => 'foo').toCustomMatch('bar');
    }).toThrow();
  });

  it('preserves error stack', () => {
    const foo = () => bar();
    const bar = () => baz();
    const baz = () => {
      throw Error('qux');
    };

    // This expecation fails due to an error we throw (intentionally)
    // The stack trace should point to the line that throws the error though,
    // Not to the line that calls the matcher.
    expect(() => {
      foo();
    }).toCustomMatch('test');
  });
});
