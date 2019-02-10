/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const Immutable = require('immutable');
const jestExpect = require('../');

['toBeCalled', 'toHaveBeenCalled'].forEach(called => {
  describe(`${called}`, () => {
    test(`works only on spies or jest.fn`, () => {
      const fn = function fn() {};

      expect(() => jestExpect(fn)[called]()).toThrowErrorMatchingSnapshot();
    });

    test(`passes when called`, () => {
      const fn = jest.fn();
      fn();
      jestExpect(fn)[called]();
      expect(() => jestExpect(fn).not[called]()).toThrowErrorMatchingSnapshot();
    });

    test(`.not passes when called`, () => {
      const fn = jest.fn();

      jestExpect(fn).not[called]();
      expect(() => jestExpect(fn)[called]()).toThrowErrorMatchingSnapshot();
    });

    test(`fails with any argument passed`, () => {
      const fn = jest.fn();

      fn();
      expect(() => jestExpect(fn)[called](555)).toThrowErrorMatchingSnapshot();
    });

    test(`.not fails with any argument passed`, () => {
      const fn = jest.fn();

      expect(() =>
        jestExpect(fn).not[called](555),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`includes the custom mock name in the error message`, () => {
      const fn = jest.fn().mockName('named-mock');

      fn();
      jestExpect(fn)[called]();
      expect(() => jestExpect(fn).not[called]()).toThrowErrorMatchingSnapshot();
    });
  });
});

['toBeCalledTimes', 'toHaveBeenCalledTimes'].forEach(calledTimes => {
  describe(`${calledTimes}`, () => {
    test('works only on spies or jest.fn', () => {
      const fn = function fn() {};

      expect(() =>
        jestExpect(fn)[calledTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('only accepts a number argument', () => {
      const fn = jest.fn();
      fn();
      jestExpect(fn)[calledTimes](1);

      [{}, [], true, 'a', new Map(), () => {}].forEach(value => {
        expect(() =>
          jestExpect(fn)[calledTimes](value),
        ).toThrowErrorMatchingSnapshot();
      });
    });

    test('.not only accepts a number argument', () => {
      const fn = jest.fn();
      jestExpect(fn).not[calledTimes](1);

      [{}, [], true, 'a', new Map(), () => {}].forEach(value => {
        expect(() =>
          jestExpect(fn).not[calledTimes](value),
        ).toThrowErrorMatchingSnapshot();
      });
    });

    test('passes if function called equal to expected times', () => {
      const fn = jest.fn();
      fn();
      fn();

      jestExpect(fn)[calledTimes](2);

      expect(() =>
        jestExpect(fn).not[calledTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('.not passes if function called more than expected times', () => {
      const fn = jest.fn();
      fn();
      fn();
      fn();

      jestExpect(fn)[calledTimes](3);
      jestExpect(fn).not[calledTimes](2);

      expect(() =>
        jestExpect(fn)[calledTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('.not passes if function called less than expected times', () => {
      const fn = jest.fn();
      fn();

      jestExpect(fn)[calledTimes](1);
      jestExpect(fn).not[calledTimes](2);

      expect(() =>
        jestExpect(fn)[calledTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('includes the custom mock name in the error message', () => {
      const fn = jest.fn().mockName('named-mock');
      fn();

      expect(() =>
        jestExpect(fn)[calledTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});

[
  'lastCalledWith',
  'toHaveBeenLastCalledWith',
  'nthCalledWith',
  'toHaveBeenNthCalledWith',
  'toBeCalledWith',
  'toHaveBeenCalledWith',
].forEach(calledWith => {
  const caller = function(callee, ...args) {
    if (
      calledWith === 'nthCalledWith' ||
      calledWith === 'toHaveBeenNthCalledWith'
    ) {
      callee(1, ...args);
    } else {
      callee(...args);
    }
  };
  describe(`${calledWith}`, () => {
    test(`works only on spies or jest.fn`, () => {
      const fn = function fn() {};

      expect(() => jestExpect(fn)[calledWith]()).toThrowErrorMatchingSnapshot();
    });

    test(`works when not called`, () => {
      const fn = jest.fn();
      caller(jestExpect(fn).not[calledWith], 'foo', 'bar');

      expect(() =>
        caller(jestExpect(fn)[calledWith], 'foo', 'bar'),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with no arguments`, () => {
      const fn = jest.fn();
      fn();
      caller(jestExpect(fn)[calledWith]);
    });

    test(`works with arguments that don't match`, () => {
      const fn = jest.fn();
      fn('foo', 'bar1');

      caller(jestExpect(fn).not[calledWith], 'foo', 'bar');

      expect(() =>
        caller(jestExpect(fn)[calledWith], 'foo', 'bar'),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with arguments that match`, () => {
      const fn = jest.fn();
      fn('foo', 'bar');

      caller(jestExpect(fn)[calledWith], 'foo', 'bar');

      expect(() =>
        caller(jestExpect(fn).not[calledWith], 'foo', 'bar'),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with trailing undefined arguments`, () => {
      const fn = jest.fn();
      fn('foo', undefined);

      expect(() =>
        caller(jestExpect(fn)[calledWith], 'foo'),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with Map`, () => {
      const fn = jest.fn();

      const m1 = new Map([[1, 2], [2, 1]]);
      const m2 = new Map([[1, 2], [2, 1]]);
      const m3 = new Map([['a', 'b'], ['b', 'a']]);

      fn(m1);

      caller(jestExpect(fn)[calledWith], m2);
      caller(jestExpect(fn).not[calledWith], m3);

      expect(() =>
        caller(jestExpect(fn).not[calledWith], m2),
      ).toThrowErrorMatchingSnapshot();
      expect(() =>
        caller(jestExpect(fn)[calledWith], m3),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with Set`, () => {
      const fn = jest.fn();

      const s1 = new Set([1, 2]);
      const s2 = new Set([1, 2]);
      const s3 = new Set([3, 4]);

      fn(s1);

      caller(jestExpect(fn)[calledWith], s2);
      caller(jestExpect(fn).not[calledWith], s3);

      expect(() =>
        caller(jestExpect(fn).not[calledWith], s2),
      ).toThrowErrorMatchingSnapshot();
      expect(() =>
        caller(jestExpect(fn)[calledWith], s3),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with Immutable.js objects`, () => {
      const fn = jest.fn();
      const directlyCreated = new Immutable.Map([['a', {b: 'c'}]]);
      const indirectlyCreated = new Immutable.Map().set('a', {b: 'c'});
      fn(directlyCreated, indirectlyCreated);

      caller(jestExpect(fn)[calledWith], indirectlyCreated, directlyCreated);

      expect(() =>
        caller(
          jestExpect(fn).not[calledWith],
          indirectlyCreated,
          directlyCreated,
        ),
      ).toThrowErrorMatchingSnapshot();
    });

    const basicCalledWith = [
      'lastCalledWith',
      'toHaveBeenLastCalledWith',
      'toBeCalledWith',
      'toHaveBeenCalledWith',
    ];

    if (basicCalledWith.indexOf(calledWith) >= 0) {
      test(`works with many arguments`, () => {
        const fn = jest.fn();
        fn('foo1', 'bar');
        fn('foo', 'bar1');
        fn('foo', 'bar');

        jestExpect(fn)[calledWith]('foo', 'bar');

        expect(() =>
          jestExpect(fn).not[calledWith]('foo', 'bar'),
        ).toThrowErrorMatchingSnapshot();
      });

      test(`works with many arguments that don't match`, () => {
        const fn = jest.fn();
        fn('foo', 'bar1');
        fn('foo', 'bar2');
        fn('foo', 'bar3');

        jestExpect(fn).not[calledWith]('foo', 'bar');

        expect(() =>
          jestExpect(fn)[calledWith]('foo', 'bar'),
        ).toThrowErrorMatchingSnapshot();
      });
    }

    const nthCalled = ['toHaveBeenNthCalledWith', 'nthCalledWith'];
    if (nthCalled.indexOf(calledWith) >= 0) {
      test(`works with three calls`, () => {
        const fn = jest.fn();
        fn('foo1', 'bar');
        fn('foo', 'bar1');
        fn('foo', 'bar');

        jestExpect(fn)[calledWith](1, 'foo1', 'bar');
        jestExpect(fn)[calledWith](2, 'foo', 'bar1');
        jestExpect(fn)[calledWith](3, 'foo', 'bar');

        expect(() => {
          jestExpect(fn).not[calledWith](1, 'foo1', 'bar');
          jestExpect(fn).not[calledWith](2, 'foo', 'bar1');
          jestExpect(fn).not[calledWith](3, 'foo', 'bar');
        }).toThrowErrorMatchingSnapshot();
      });

      test('should replace 1st, 2nd, 3rd with first, second, third', async () => {
        const fn = jest.fn();
        fn('foo1', 'bar');
        fn('foo', 'bar1');
        fn('foo', 'bar');

        expect(() => {
          jestExpect(fn)[calledWith](1, 'foo', 'bar');
          jestExpect(fn)[calledWith](2, 'foo', 'bar');
          jestExpect(fn)[calledWith](3, 'foo1', 'bar');
        }).toThrowErrorMatchingSnapshot();

        expect(() => {
          jestExpect(fn).not[calledWith](1, 'foo1', 'bar');
          jestExpect(fn).not[calledWith](2, 'foo', 'bar1');
          jestExpect(fn).not[calledWith](3, 'foo', 'bar');
        }).toThrowErrorMatchingSnapshot();
      });

      test('should reject nth value smaller than 1', async () => {
        const fn = jest.fn();
        fn('foo1', 'bar');

        expect(() => {
          jestExpect(fn)[calledWith](0, 'foo1', 'bar');
        }).toThrowErrorMatchingSnapshot();
      });

      test('should reject non integer nth value', async () => {
        const fn = jest.fn();
        fn('foo1', 'bar');

        expect(() => {
          jestExpect(fn)[calledWith](0.1, 'foo1', 'bar');
        }).toThrowErrorMatchingSnapshot();
      });
    }

    test(`includes the custom mock name in the error message`, () => {
      const fn = jest.fn().mockName('named-mock');
      fn('foo', 'bar');

      caller(jestExpect(fn)[calledWith], 'foo', 'bar');

      expect(() =>
        caller(jestExpect(fn).not[calledWith], 'foo', 'bar'),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});

['toReturn', 'toHaveReturned'].forEach(returned => {
  describe(`${returned}`, () => {
    test(`works only on spies or jest.fn`, () => {
      const fn = function fn() {};

      expect(() => jestExpect(fn)[returned]()).toThrowErrorMatchingSnapshot();
    });

    test(`passes when returned`, () => {
      const fn = jest.fn(() => 42);
      fn();
      jestExpect(fn)[returned]();
      expect(() =>
        jestExpect(fn).not[returned](),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`passes when undefined is returned`, () => {
      const fn = jest.fn(() => undefined);
      fn();
      jestExpect(fn)[returned]();
      expect(() =>
        jestExpect(fn).not[returned](),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`passes when at least one call does not throw`, () => {
      const fn = jest.fn(causeError => {
        if (causeError) {
          throw new Error('Error!');
        }

        return 42;
      });

      fn(false);

      try {
        fn(true);
      } catch (error) {
        // ignore error
      }

      fn(false);

      jestExpect(fn)[returned]();
      expect(() =>
        jestExpect(fn).not[returned](),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`.not passes when not returned`, () => {
      const fn = jest.fn();

      jestExpect(fn).not[returned]();
      expect(() => jestExpect(fn)[returned]()).toThrowErrorMatchingSnapshot();
    });

    test(`.not passes when all calls throw`, () => {
      const fn = jest.fn(() => {
        throw new Error('Error!');
      });

      try {
        fn();
      } catch (error) {
        // ignore error
      }

      try {
        fn();
      } catch (error) {
        // ignore error
      }

      jestExpect(fn).not[returned]();
      expect(() => jestExpect(fn)[returned]()).toThrowErrorMatchingSnapshot();
    });

    test(`.not passes when a call throws undefined`, () => {
      const fn = jest.fn(() => {
        // eslint-disable-next-line no-throw-literal
        throw undefined;
      });

      try {
        fn();
      } catch (error) {
        // ignore error
      }

      jestExpect(fn).not[returned]();
      expect(() => jestExpect(fn)[returned]()).toThrowErrorMatchingSnapshot();
    });

    test(`fails with any argument passed`, () => {
      const fn = jest.fn();

      fn();
      expect(() =>
        jestExpect(fn)[returned](555),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`.not fails with any argument passed`, () => {
      const fn = jest.fn();

      expect(() =>
        jestExpect(fn).not[returned](555),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`includes the custom mock name in the error message`, () => {
      const fn = jest.fn(() => 42).mockName('named-mock');
      fn();
      jestExpect(fn)[returned]();
      expect(() =>
        jestExpect(fn).not[returned](),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`incomplete recursive calls are handled properly`, () => {
      // sums up all integers from 0 -> value, using recursion
      const fn = jest.fn(value => {
        if (value === 0) {
          // Before returning from the base case of recursion, none of the
          // calls have returned yet.
          jestExpect(fn).not[returned]();
          expect(() =>
            jestExpect(fn)[returned](),
          ).toThrowErrorMatchingSnapshot();
          return 0;
        } else {
          return value + fn(value - 1);
        }
      });

      fn(3);
    });
  });
});

['toReturnTimes', 'toHaveReturnedTimes'].forEach(returnedTimes => {
  describe(`${returnedTimes}`, () => {
    test('works only on spies or jest.fn', () => {
      const fn = function fn() {};

      expect(() =>
        jestExpect(fn)[returnedTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('only accepts a number argument', () => {
      const fn = jest.fn(() => 42);
      fn();
      jestExpect(fn)[returnedTimes](1);

      [{}, [], true, 'a', new Map(), () => {}].forEach(value => {
        expect(() =>
          jestExpect(fn)[returnedTimes](value),
        ).toThrowErrorMatchingSnapshot();
      });
    });

    test('.not only accepts a number argument', () => {
      const fn = jest.fn(() => 42);
      jestExpect(fn).not[returnedTimes](2);

      [{}, [], true, 'a', new Map(), () => {}].forEach(value => {
        expect(() =>
          jestExpect(fn).not[returnedTimes](value),
        ).toThrowErrorMatchingSnapshot();
      });
    });

    test('passes if function returned equal to expected times', () => {
      const fn = jest.fn(() => 42);
      fn();
      fn();

      jestExpect(fn)[returnedTimes](2);

      expect(() =>
        jestExpect(fn).not[returnedTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('calls that return undefined are counted as returns', () => {
      const fn = jest.fn(() => undefined);
      fn();
      fn();

      jestExpect(fn)[returnedTimes](2);

      expect(() =>
        jestExpect(fn).not[returnedTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('.not passes if function returned more than expected times', () => {
      const fn = jest.fn(() => 42);
      fn();
      fn();
      fn();

      jestExpect(fn)[returnedTimes](3);
      jestExpect(fn).not[returnedTimes](2);

      expect(() =>
        jestExpect(fn)[returnedTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('.not passes if function called less than expected times', () => {
      const fn = jest.fn(() => 42);
      fn();

      jestExpect(fn)[returnedTimes](1);
      jestExpect(fn).not[returnedTimes](2);

      expect(() =>
        jestExpect(fn)[returnedTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('calls that throw are not counted', () => {
      const fn = jest.fn(causeError => {
        if (causeError) {
          throw new Error('Error!');
        }

        return 42;
      });

      fn(false);

      try {
        fn(true);
      } catch (error) {
        // ignore error
      }

      fn(false);

      jestExpect(fn)[returnedTimes](2);

      expect(() =>
        jestExpect(fn).not[returnedTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('calls that throw undefined are not counted', () => {
      const fn = jest.fn(causeError => {
        if (causeError) {
          // eslint-disable-next-line no-throw-literal
          throw undefined;
        }

        return 42;
      });

      fn(false);

      try {
        fn(true);
      } catch (error) {
        // ignore error
      }

      fn(false);

      jestExpect(fn)[returnedTimes](2);

      expect(() =>
        jestExpect(fn).not[returnedTimes](2),
      ).toThrowErrorMatchingSnapshot();
    });

    test('includes the custom mock name in the error message', () => {
      const fn = jest.fn(() => 42).mockName('named-mock');
      fn();
      fn();

      jestExpect(fn)[returnedTimes](2);

      expect(() =>
        jestExpect(fn)[returnedTimes](1),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`incomplete recursive calls are handled properly`, () => {
      // sums up all integers from 0 -> value, using recursion
      const fn = jest.fn(value => {
        if (value === 0) {
          return 0;
        } else {
          const recursiveResult = fn(value - 1);

          if (value === 2) {
            // Only 2 of the recursive calls have returned at this point
            jestExpect(fn)[returnedTimes](2);
            expect(() =>
              jestExpect(fn).not[returnedTimes](2),
            ).toThrowErrorMatchingSnapshot();
          }

          return value + recursiveResult;
        }
      });

      fn(3);
    });
  });
});

[
  'lastReturnedWith',
  'toHaveLastReturnedWith',
  'nthReturnedWith',
  'toHaveNthReturnedWith',
  'toReturnWith',
  'toHaveReturnedWith',
].forEach(returnedWith => {
  const caller = function(callee, ...args) {
    if (
      returnedWith === 'nthReturnedWith' ||
      returnedWith === 'toHaveNthReturnedWith'
    ) {
      callee(1, ...args);
    } else {
      callee(...args);
    }
  };

  describe(`${returnedWith}`, () => {
    test(`works only on spies or jest.fn`, () => {
      const fn = function fn() {};

      expect(() =>
        jestExpect(fn)[returnedWith](),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works when not called`, () => {
      const fn = jest.fn();
      caller(jestExpect(fn).not[returnedWith], 'foo');

      expect(() =>
        caller(jestExpect(fn)[returnedWith], 'foo'),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with no arguments`, () => {
      const fn = jest.fn();
      fn();
      caller(jestExpect(fn)[returnedWith]);
    });

    test('works with argument that does not match', () => {
      const fn = jest.fn(() => 'foo');
      fn();

      caller(jestExpect(fn).not[returnedWith], 'bar');

      expect(() =>
        caller(jestExpect(fn)[returnedWith], 'bar'),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with argument that does match`, () => {
      const fn = jest.fn(() => 'foo');
      fn();

      caller(jestExpect(fn)[returnedWith], 'foo');

      expect(() =>
        caller(jestExpect(fn).not[returnedWith], 'foo'),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with undefined`, () => {
      const fn = jest.fn(() => undefined);
      fn();

      caller(jestExpect(fn)[returnedWith], undefined);

      expect(() =>
        caller(jestExpect(fn).not[returnedWith], undefined),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with Map`, () => {
      const m1 = new Map([[1, 2], [2, 1]]);
      const m2 = new Map([[1, 2], [2, 1]]);
      const m3 = new Map([['a', 'b'], ['b', 'a']]);

      const fn = jest.fn(() => m1);
      fn();

      caller(jestExpect(fn)[returnedWith], m2);
      caller(jestExpect(fn).not[returnedWith], m3);

      expect(() =>
        caller(jestExpect(fn).not[returnedWith], m2),
      ).toThrowErrorMatchingSnapshot();
      expect(() =>
        caller(jestExpect(fn)[returnedWith], m3),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with Set`, () => {
      const s1 = new Set([1, 2]);
      const s2 = new Set([1, 2]);
      const s3 = new Set([3, 4]);

      const fn = jest.fn(() => s1);
      fn();

      caller(jestExpect(fn)[returnedWith], s2);
      caller(jestExpect(fn).not[returnedWith], s3);

      expect(() =>
        caller(jestExpect(fn).not[returnedWith], s2),
      ).toThrowErrorMatchingSnapshot();
      expect(() =>
        caller(jestExpect(fn)[returnedWith], s3),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with Immutable.js objects directly created`, () => {
      const directlyCreated = new Immutable.Map([['a', {b: 'c'}]]);
      const fn = jest.fn(() => directlyCreated);
      fn();

      caller(jestExpect(fn)[returnedWith], directlyCreated);

      expect(() =>
        caller(jestExpect(fn).not[returnedWith], directlyCreated),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`works with Immutable.js objects indirectly created`, () => {
      const indirectlyCreated = new Immutable.Map().set('a', {b: 'c'});
      const fn = jest.fn(() => indirectlyCreated);
      fn();

      caller(jestExpect(fn)[returnedWith], indirectlyCreated);

      expect(() =>
        caller(jestExpect(fn).not[returnedWith], indirectlyCreated),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`a call that throws is not considered to have returned`, () => {
      const fn = jest.fn(() => {
        throw new Error('Error!');
      });

      try {
        fn();
      } catch (error) {
        // ignore error
      }

      // It doesn't matter what return value is tested if the call threw
      caller(jestExpect(fn).not[returnedWith], 'foo');
      caller(jestExpect(fn).not[returnedWith], null);
      caller(jestExpect(fn).not[returnedWith], undefined);

      expect(() =>
        caller(jestExpect(fn)[returnedWith], undefined),
      ).toThrowErrorMatchingSnapshot();
    });

    test(`a call that throws undefined is not considered to have returned`, () => {
      const fn = jest.fn(() => {
        // eslint-disable-next-line no-throw-literal
        throw undefined;
      });

      try {
        fn();
      } catch (error) {
        // ignore error
      }

      // It doesn't matter what return value is tested if the call threw
      caller(jestExpect(fn).not[returnedWith], 'foo');
      caller(jestExpect(fn).not[returnedWith], null);
      caller(jestExpect(fn).not[returnedWith], undefined);

      expect(() =>
        caller(jestExpect(fn)[returnedWith], undefined),
      ).toThrowErrorMatchingSnapshot();
    });

    const basicReturnedWith = ['toHaveReturnedWith', 'toReturnWith'];
    if (basicReturnedWith.indexOf(returnedWith) >= 0) {
      test(`works with more calls than the limit`, () => {
        const fn = jest.fn();
        fn.mockReturnValueOnce('foo1');
        fn.mockReturnValueOnce('foo2');
        fn.mockReturnValueOnce('foo3');
        fn.mockReturnValueOnce('foo4');
        fn.mockReturnValueOnce('foo5');
        fn.mockReturnValueOnce('foo6');

        fn();
        fn();
        fn();
        fn();
        fn();
        fn();

        jestExpect(fn).not[returnedWith]('bar');

        expect(() => {
          jestExpect(fn)[returnedWith]('bar');
        }).toThrowErrorMatchingSnapshot();
      });

      test(`incomplete recursive calls are handled properly`, () => {
        // sums up all integers from 0 -> value, using recursion
        const fn = jest.fn(value => {
          if (value === 0) {
            // Before returning from the base case of recursion, none of the
            // calls have returned yet.
            // This test ensures that the incomplete calls are not incorrectly
            // interpretted as have returned undefined
            jestExpect(fn).not[returnedWith](undefined);
            expect(() =>
              jestExpect(fn)[returnedWith](undefined),
            ).toThrowErrorMatchingSnapshot();

            return 0;
          } else {
            return value + fn(value - 1);
          }
        });

        fn(3);
      });
    }

    const nthReturnedWith = ['toHaveNthReturnedWith', 'nthReturnedWith'];
    if (nthReturnedWith.indexOf(returnedWith) >= 0) {
      test(`works with three calls`, () => {
        const fn = jest.fn();
        fn.mockReturnValueOnce('foo1');
        fn.mockReturnValueOnce('foo2');
        fn.mockReturnValueOnce('foo3');
        fn();
        fn();
        fn();

        jestExpect(fn)[returnedWith](1, 'foo1');
        jestExpect(fn)[returnedWith](2, 'foo2');
        jestExpect(fn)[returnedWith](3, 'foo3');

        expect(() => {
          jestExpect(fn).not[returnedWith](1, 'foo1');
          jestExpect(fn).not[returnedWith](2, 'foo2');
          jestExpect(fn).not[returnedWith](3, 'foo3');
        }).toThrowErrorMatchingSnapshot();
      });

      test('should replace 1st, 2nd, 3rd with first, second, third', async () => {
        const fn = jest.fn();
        fn.mockReturnValueOnce('foo1');
        fn.mockReturnValueOnce('foo2');
        fn.mockReturnValueOnce('foo3');
        fn();
        fn();
        fn();

        expect(() => {
          jestExpect(fn)[returnedWith](1, 'bar1');
          jestExpect(fn)[returnedWith](2, 'bar2');
          jestExpect(fn)[returnedWith](3, 'bar3');
        }).toThrowErrorMatchingSnapshot();

        expect(() => {
          jestExpect(fn).not[returnedWith](1, 'foo1');
          jestExpect(fn).not[returnedWith](2, 'foo2');
          jestExpect(fn).not[returnedWith](3, 'foo3');
        }).toThrowErrorMatchingSnapshot();
      });

      test('should reject nth value smaller than 1', async () => {
        const fn = jest.fn(() => 'foo');
        fn();

        expect(() => {
          jestExpect(fn)[returnedWith](0, 'foo');
        }).toThrowErrorMatchingSnapshot();
      });

      test('should reject nth value greater than number of calls', async () => {
        const fn = jest.fn(() => 'foo');
        fn();
        fn();
        fn();

        expect(() => {
          jestExpect(fn)[returnedWith](4, 'foo');
        }).toThrowErrorMatchingSnapshot();
      });

      test('should reject non integer nth value', async () => {
        const fn = jest.fn(() => 'foo');
        fn('foo');

        expect(() => {
          jestExpect(fn)[returnedWith](0.1, 'foo');
        }).toThrowErrorMatchingSnapshot();
      });

      test(`incomplete recursive calls are handled properly`, () => {
        // sums up all integers from 0 -> value, using recursion
        const fn = jest.fn(value => {
          if (value === 0) {
            return 0;
          } else {
            const recursiveResult = fn(value - 1);

            if (value === 2) {
              // Only 2 of the recursive calls have returned at this point
              jestExpect(fn).not[returnedWith](1, 6);
              jestExpect(fn).not[returnedWith](2, 3);
              jestExpect(fn)[returnedWith](3, 1);
              jestExpect(fn)[returnedWith](4, 0);

              expect(() =>
                jestExpect(fn)[returnedWith](1, 6),
              ).toThrowErrorMatchingSnapshot();
              expect(() =>
                jestExpect(fn)[returnedWith](2, 3),
              ).toThrowErrorMatchingSnapshot();
              expect(() =>
                jestExpect(fn).not[returnedWith](3, 1),
              ).toThrowErrorMatchingSnapshot();
              expect(() =>
                jestExpect(fn).not[returnedWith](4, 0),
              ).toThrowErrorMatchingSnapshot();
            }

            return value + recursiveResult;
          }
        });

        fn(3);
      });
    }

    const lastReturnedWith = ['toHaveLastReturnedWith', 'lastReturnedWith'];
    if (lastReturnedWith.indexOf(returnedWith) >= 0) {
      test(`works with three calls`, () => {
        const fn = jest.fn();
        fn.mockReturnValueOnce('foo1');
        fn.mockReturnValueOnce('foo2');
        fn.mockReturnValueOnce('foo3');
        fn();
        fn();
        fn();

        jestExpect(fn)[returnedWith]('foo3');

        expect(() => {
          jestExpect(fn).not[returnedWith]('foo3');
        }).toThrowErrorMatchingSnapshot();
      });

      test(`incomplete recursive calls are handled properly`, () => {
        // sums up all integers from 0 -> value, using recursion
        const fn = jest.fn(value => {
          if (value === 0) {
            // Before returning from the base case of recursion, none of the
            // calls have returned yet.
            jestExpect(fn).not[returnedWith](0);
            expect(() =>
              jestExpect(fn)[returnedWith](0),
            ).toThrowErrorMatchingSnapshot();
            return 0;
          } else {
            return value + fn(value - 1);
          }
        });

        fn(3);
      });
    }

    test(`includes the custom mock name in the error message`, () => {
      const fn = jest.fn().mockName('named-mock');
      caller(jestExpect(fn).not[returnedWith], 'foo');

      expect(() =>
        caller(jestExpect(fn)[returnedWith], 'foo'),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
