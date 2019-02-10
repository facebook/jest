/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const jestExpect = require('../');

jestExpect.extend({
  toCustomMatch(callback, expectation) {
    const actual = callback();

    if (actual !== expectation) {
      return {
        message: () => `Expected "${expectation}" but got "${actual}"`,
        pass: false,
      };
    }

    return {pass: true};
  },
  toMatchPredicate(received, argument) {
    argument(received);
    return {
      message: () => '',
      pass: true,
    };
  },
});

it('stack trace points to correct location when using matchers', () => {
  try {
    jestExpect(true).toBe(false);
  } catch (error) {
    expect(error.stack).toContain('stacktrace.test.js:35');
  }
});

it('stack trace points to correct location when using nested matchers', () => {
  try {
    jestExpect(true).toMatchPredicate(value => {
      jestExpect(value).toBe(false);
    });
  } catch (error) {
    expect(error.stack).toContain('stacktrace.test.js:44');
  }
});

it('stack trace points to correct location when throwing from a custom matcher', () => {
  try {
    jestExpect(() => {
      const foo = () => bar();
      const bar = () => baz();
      const baz = () => {
        throw new Error('Expected');
      };

      foo();
    }).toCustomMatch('bar');
  } catch (error) {
    expect(error.stack).toContain('stacktrace.test.js:57');
  }
});
