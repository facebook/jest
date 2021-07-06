/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable local/ban-types-eventually, local/prefer-rest-params-eventually */

import vm, {Context} from 'vm';
import {ModuleMocker, fn, spyOn} from '../';

describe('moduleMocker', () => {
  let moduleMocker: ModuleMocker;
  let mockContext: Context;
  let mockGlobals: typeof globalThis;

  beforeEach(() => {
    mockContext = vm.createContext();
    mockGlobals = vm.runInNewContext('this', mockContext);
    moduleMocker = new ModuleMocker(mockGlobals);
  });

  describe('getMetadata', () => {
    it('returns the function `name` property', () => {
      function x() {}
      const metadata = moduleMocker.getMetadata(x);
      expect(x.name).toBe('x');
      expect(metadata.name).toBe('x');
    });

    it('mocks constant values', () => {
      const metadata = moduleMocker.getMetadata(Symbol.for('bowties.are.cool'));
      expect(metadata.value).toEqual(Symbol.for('bowties.are.cool'));
      expect(moduleMocker.getMetadata('banana').value).toEqual('banana');
      expect(moduleMocker.getMetadata(27).value).toEqual(27);
      expect(moduleMocker.getMetadata(false).value).toEqual(false);
      expect(moduleMocker.getMetadata(Infinity).value).toEqual(Infinity);
    });

    it('does not retrieve metadata for arrays', () => {
      const array = [1, 2, 3];
      const metadata = moduleMocker.getMetadata(array);
      expect(metadata.value).toBeUndefined();
      expect(metadata.members).toBeUndefined();
      expect(metadata.type).toEqual('array');
    });

    it('does not retrieve metadata for undefined', () => {
      const metadata = moduleMocker.getMetadata(undefined);
      expect(metadata.value).toBeUndefined();
      expect(metadata.members).toBeUndefined();
      expect(metadata.type).toEqual('undefined');
    });

    it('does not retrieve metadata for null', () => {
      const metadata = moduleMocker.getMetadata(null);
      expect(metadata.value).toBeNull();
      expect(metadata.members).toBeUndefined();
      expect(metadata.type).toEqual('null');
    });

    it('retrieves metadata for ES6 classes', () => {
      class ClassFooMock {
        bar() {}
      }
      const fooInstance = new ClassFooMock();
      const metadata = moduleMocker.getMetadata(fooInstance);
      expect(metadata.type).toEqual('object');
      expect(metadata.members.constructor.name).toEqual('ClassFooMock');
    });

    it('retrieves synchronous function metadata', () => {
      function functionFooMock() {}
      const metadata = moduleMocker.getMetadata(functionFooMock);
      expect(metadata.type).toEqual('function');
      expect(metadata.name).toEqual('functionFooMock');
    });

    it('retrieves asynchronous function metadata', () => {
      async function asyncFunctionFooMock() {}
      const metadata = moduleMocker.getMetadata(asyncFunctionFooMock);
      expect(metadata.type).toEqual('function');
      expect(metadata.name).toEqual('asyncFunctionFooMock');
    });

    it("retrieves metadata for object literals and it's members", () => {
      const metadata = moduleMocker.getMetadata({
        bar: 'two',
        foo: 1,
      });
      expect(metadata.type).toEqual('object');
      expect(metadata.members.bar.value).toEqual('two');
      expect(metadata.members.bar.type).toEqual('constant');
      expect(metadata.members.foo.value).toEqual(1);
      expect(metadata.members.foo.type).toEqual('constant');
    });

    it('retrieves Date object metadata', () => {
      const metadata = moduleMocker.getMetadata(Date);
      expect(metadata.type).toEqual('function');
      expect(metadata.name).toEqual('Date');
      expect(metadata.members.now.name).toEqual('now');
      expect(metadata.members.parse.name).toEqual('parse');
      expect(metadata.members.UTC.name).toEqual('UTC');
    });
  });

  describe('generateFromMetadata', () => {
    it('forwards the function name property', () => {
      function foo() {}
      const mock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(foo),
      );
      expect(mock.name).toBe('foo');
    });

    it('fixes illegal function name properties', () => {
      function getMockFnWithOriginalName(name) {
        const fn = () => {};
        Object.defineProperty(fn, 'name', {value: name});

        return moduleMocker.generateFromMetadata(moduleMocker.getMetadata(fn));
      }

      expect(getMockFnWithOriginalName('1').name).toBe('$1');
      expect(getMockFnWithOriginalName('foo-bar').name).toBe('foo$bar');
      expect(getMockFnWithOriginalName('foo-bar-2').name).toBe('foo$bar$2');
      expect(getMockFnWithOriginalName('foo-bar-3').name).toBe('foo$bar$3');
      expect(getMockFnWithOriginalName('foo/bar').name).toBe('foo$bar');
      expect(getMockFnWithOriginalName('foo𠮷bar').name).toBe('foo𠮷bar');
    });

    it('special cases the mockConstructor name', () => {
      function mockConstructor() {}
      const mock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(mockConstructor),
      );
      // Depends on node version
      expect(!mock.name || mock.name === 'mockConstructor').toBeTruthy();
    });

    it('wont interfere with previous mocks on a shared prototype', () => {
      const ClassFoo = function () {};
      ClassFoo.prototype.x = () => {};
      const ClassFooMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(ClassFoo),
      );
      const foo = new ClassFooMock();
      const bar = new ClassFooMock();

      foo.x.mockImplementation(() => 'Foo');
      bar.x.mockImplementation(() => 'Bar');

      expect(foo.x()).toBe('Foo');
      expect(bar.x()).toBe('Bar');
    });

    it('does not mock non-enumerable getters', () => {
      const foo = Object.defineProperties(
        {},
        {
          nonEnumGetter: {
            get: () => {
              throw new Error();
            },
          },
          nonEnumMethod: {
            value: () => {},
          },
        },
      );
      const mock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(foo),
      );

      expect(typeof foo.nonEnumMethod).toBe('function');

      expect(mock.nonEnumMethod.mock).toBeDefined();
      expect(mock.nonEnumGetter).toBeUndefined();
    });

    it('mocks getters of ES modules', () => {
      const foo = Object.defineProperties(
        {},
        {
          __esModule: {
            value: true,
          },
          enumGetter: {
            enumerable: true,
            get: () => 10,
          },
        },
      );
      const mock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(foo),
      );
      expect(mock.enumGetter).toBeDefined();
    });

    it('mocks ES2015 non-enumerable methods', () => {
      class ClassFoo {
        foo() {}
        toString() {
          return 'Foo';
        }
      }

      const ClassFooMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(ClassFoo),
      );
      const foo = new ClassFooMock();

      const instanceFoo = new ClassFoo();
      const instanceFooMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(instanceFoo),
      );

      expect(typeof foo.foo).toBe('function');
      expect(typeof instanceFooMock.foo).toBe('function');
      expect(instanceFooMock.foo.mock).toBeDefined();

      expect(instanceFooMock.toString.mock).toBeDefined();
    });

    it('mocks ES2015 non-enumerable static properties and methods', () => {
      class ClassFoo {
        static foo() {}
        static fooProp: Function;
      }
      ClassFoo.fooProp = () => {};

      class ClassBar extends ClassFoo {}

      const ClassBarMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(ClassBar),
      );

      expect(typeof ClassBarMock.foo).toBe('function');
      expect(typeof ClassBarMock.fooProp).toBe('function');
      expect(ClassBarMock.foo.mock).toBeDefined();
      expect(ClassBarMock.fooProp.mock).toBeDefined();
    });

    it('mocks methods in all the prototype chain (null prototype)', () => {
      const Foo = Object.assign(Object.create(null), {foo() {}});
      const Bar = Object.assign(Object.create(Foo), {bar() {}});

      const BarMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(Bar),
      );
      expect(typeof BarMock.foo).toBe('function');
      expect(typeof BarMock.bar).toBe('function');
    });

    it('does not mock methods from Object.prototype', () => {
      const Foo = {foo() {}};
      const Bar = Object.assign(Object.create(Foo), {bar() {}});

      const BarMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(Bar),
      );

      expect(BarMock).toBeInstanceOf(mockGlobals.Object);
      expect(
        Object.prototype.hasOwnProperty.call(BarMock, 'hasOwnProperty'),
      ).toBe(false);
      expect(BarMock.hasOwnProperty).toBe(
        mockGlobals.Object.prototype.hasOwnProperty,
      );
    });

    it('does not mock methods from Object.prototype (in mock context)', () => {
      const Bar = vm.runInContext(
        `
          const Foo = { foo() {} };
          const Bar = Object.assign(Object.create(Foo), { bar() {} });
          Bar;
        `,
        mockContext,
      );

      const BarMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(Bar),
      );

      expect(BarMock).toBeInstanceOf(mockGlobals.Object);
      expect(
        Object.prototype.hasOwnProperty.call(BarMock, 'hasOwnProperty'),
      ).toBe(false);
      expect(BarMock.hasOwnProperty).toBe(
        mockGlobals.Object.prototype.hasOwnProperty,
      );
    });

    it('does not mock methods from Function.prototype', () => {
      class Foo {}
      class Bar extends Foo {}

      const BarMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(Bar),
      );

      expect(BarMock).toBeInstanceOf(mockGlobals.Function);
      expect(Object.prototype.hasOwnProperty.call(BarMock, 'bind')).toBe(false);
      expect(BarMock.bind).toBe(mockGlobals.Function.prototype.bind);
    });

    it('does not mock methods from Function.prototype (in mock context)', () => {
      const Bar = vm.runInContext(
        `
          class Foo {}
          class Bar extends Foo {}
          Bar;
        `,
        mockContext,
      );

      const BarMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(Bar),
      );

      expect(BarMock).toBeInstanceOf(mockGlobals.Function);
      expect(Object.prototype.hasOwnProperty.call(BarMock, 'bind')).toBe(false);
      expect(BarMock.bind).toBe(mockGlobals.Function.prototype.bind);
    });

    it('does not mock methods from RegExp.prototype', () => {
      const bar = /bar/;

      const barMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(bar),
      );

      expect(barMock).toBeInstanceOf(mockGlobals.RegExp);
      expect(Object.prototype.hasOwnProperty.call(barMock, 'test')).toBe(false);
      expect(barMock.test).toBe(mockGlobals.RegExp.prototype.test);
    });

    it('does not mock methods from RegExp.prototype (in mock context)', () => {
      const bar = vm.runInContext(
        `
          const bar = /bar/;
          bar;
        `,
        mockContext,
      );

      const barMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(bar),
      );

      expect(barMock).toBeInstanceOf(mockGlobals.RegExp);
      expect(Object.prototype.hasOwnProperty.call(barMock, 'test')).toBe(false);
      expect(barMock.test).toBe(mockGlobals.RegExp.prototype.test);
    });

    it('mocks methods that are bound multiple times', () => {
      const func = function func() {};
      const multipleBoundFunc = func.bind(null).bind(null);

      const multipleBoundFuncMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(multipleBoundFunc),
      );

      expect(typeof multipleBoundFuncMock).toBe('function');
    });

    it('mocks methods that are bound after mocking', () => {
      const fooMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(() => {}),
      );

      const barMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(fooMock.bind(null)),
      );

      expect(barMock).not.toThrow();
    });

    it('mocks regexp instances', () => {
      expect(() =>
        moduleMocker.generateFromMetadata(moduleMocker.getMetadata(/a/)),
      ).not.toThrow();
    });

    it('mocks functions with numeric names', () => {
      const obj = {
        1: () => {},
      };

      const objMock = moduleMocker.generateFromMetadata(
        moduleMocker.getMetadata(obj),
      );

      expect(typeof objMock[1]).toBe('function');
    });

    describe('mocked functions', () => {
      it('tracks calls to mocks', () => {
        const fn = moduleMocker.fn();
        expect(fn.mock.calls).toEqual([]);

        fn(1, 2, 3);
        expect(fn.mock.calls).toEqual([[1, 2, 3]]);

        fn('a', 'b', 'c');
        expect(fn.mock.calls).toEqual([
          [1, 2, 3],
          ['a', 'b', 'c'],
        ]);
      });

      it('tracks instances made by mocks', () => {
        const fn = moduleMocker.fn();
        expect(fn.mock.instances).toEqual([]);

        const instance1 = new fn();
        expect(fn.mock.instances[0]).toBe(instance1);

        const instance2 = new fn();
        expect(fn.mock.instances[1]).toBe(instance2);
      });

      it('supports clearing mock calls', () => {
        const fn = moduleMocker.fn();
        expect(fn.mock.calls).toEqual([]);

        fn(1, 2, 3);
        expect(fn.mock.calls).toEqual([[1, 2, 3]]);

        fn.mockReturnValue('abcd');

        fn.mockClear();
        expect(fn.mock.calls).toEqual([]);

        fn('a', 'b', 'c');
        expect(fn.mock.calls).toEqual([['a', 'b', 'c']]);

        expect(fn()).toEqual('abcd');
      });

      it('supports clearing mocks', () => {
        const fn = moduleMocker.fn();
        expect(fn.mock.calls).toEqual([]);

        fn(1, 2, 3);
        expect(fn.mock.calls).toEqual([[1, 2, 3]]);

        fn.mockClear();
        expect(fn.mock.calls).toEqual([]);

        fn('a', 'b', 'c');
        expect(fn.mock.calls).toEqual([['a', 'b', 'c']]);
      });

      it('supports clearing all mocks', () => {
        const fn1 = moduleMocker.fn();
        fn1.mockImplementation(() => 'abcd');
        fn1(1, 2, 3);
        expect(fn1.mock.calls).toEqual([[1, 2, 3]]);

        const fn2 = moduleMocker.fn();
        fn2.mockReturnValue('abcde');
        fn2('a', 'b', 'c', 'd');
        expect(fn2.mock.calls).toEqual([['a', 'b', 'c', 'd']]);

        moduleMocker.clearAllMocks();
        expect(fn1.mock.calls).toEqual([]);
        expect(fn2.mock.calls).toEqual([]);
        expect(fn1()).toEqual('abcd');
        expect(fn2()).toEqual('abcde');
      });

      it('supports resetting mock return values', () => {
        const fn = moduleMocker.fn();
        fn.mockReturnValue('abcd');

        const before = fn();
        expect(before).toEqual('abcd');

        fn.mockReset();

        const after = fn();
        expect(after).not.toEqual('abcd');
      });

      it('supports resetting single use mock return values', () => {
        const fn = moduleMocker.fn();
        fn.mockReturnValueOnce('abcd');

        fn.mockReset();

        const after = fn();
        expect(after).not.toEqual('abcd');
      });

      it('supports resetting mock implementations', () => {
        const fn = moduleMocker.fn();
        fn.mockImplementation(() => 'abcd');

        const before = fn();
        expect(before).toEqual('abcd');

        fn.mockReset();

        const after = fn();
        expect(after).not.toEqual('abcd');
      });

      it('supports resetting single use mock implementations', () => {
        const fn = moduleMocker.fn();
        fn.mockImplementationOnce(() => 'abcd');

        fn.mockReset();

        const after = fn();
        expect(after).not.toEqual('abcd');
      });

      it('supports resetting all mocks', () => {
        const fn1 = moduleMocker.fn();
        fn1.mockImplementation(() => 'abcd');
        fn1(1, 2, 3);
        expect(fn1.mock.calls).toEqual([[1, 2, 3]]);

        const fn2 = moduleMocker.fn();
        fn2.mockReturnValue('abcd');
        fn2('a', 'b', 'c');
        expect(fn2.mock.calls).toEqual([['a', 'b', 'c']]);

        moduleMocker.resetAllMocks();
        expect(fn1.mock.calls).toEqual([]);
        expect(fn2.mock.calls).toEqual([]);
        expect(fn1()).not.toEqual('abcd');
        expect(fn2()).not.toEqual('abcd');
      });

      it('maintains function arity', () => {
        const mockFunctionArity1 = moduleMocker.fn(x => x);
        const mockFunctionArity2 = moduleMocker.fn((x, y) => y);

        expect(mockFunctionArity1.length).toBe(1);
        expect(mockFunctionArity2.length).toBe(2);
      });
    });

    it('mocks the method in the passed object itself', () => {
      const parent = {func: () => 'abcd'};
      const child = Object.create(parent);

      moduleMocker.spyOn(child, 'func').mockReturnValue('efgh');

      expect(child.hasOwnProperty('func')).toBe(true);
      expect(child.func()).toEqual('efgh');
      expect(parent.func()).toEqual('abcd');
    });

    it('should delete previously inexistent methods when restoring', () => {
      const parent = {func: () => 'abcd'};
      const child = Object.create(parent);

      moduleMocker.spyOn(child, 'func').mockReturnValue('efgh');

      moduleMocker.restoreAllMocks();
      expect(child.func()).toEqual('abcd');

      moduleMocker.spyOn(parent, 'func').mockReturnValue('jklm');

      expect(child.hasOwnProperty('func')).toBe(false);
      expect(child.func()).toEqual('jklm');
    });

    it('supports mock value returning undefined', () => {
      const obj = {
        func: () => 'some text',
      };

      moduleMocker.spyOn(obj, 'func').mockReturnValue(undefined);

      expect(obj.func()).not.toEqual('some text');
    });

    it('supports mock value once returning undefined', () => {
      const obj = {
        func: () => 'some text',
      };

      moduleMocker.spyOn(obj, 'func').mockReturnValueOnce(undefined);

      expect(obj.func()).not.toEqual('some text');
    });

    it('mockReturnValueOnce mocks value just once', () => {
      const fake = jest.fn(a => a + 2);
      fake.mockReturnValueOnce(42);
      expect(fake(2)).toEqual(42);
      expect(fake(2)).toEqual(4);
    });

    it('supports mocking resolvable async functions', () => {
      const fn = moduleMocker.fn();
      fn.mockResolvedValue('abcd');

      const promise = fn();

      expect(promise).toBeInstanceOf(Promise);

      return expect(promise).resolves.toBe('abcd');
    });

    it('supports mocking resolvable async functions only once', () => {
      const fn = moduleMocker.fn();
      fn.mockResolvedValue('abcd');
      fn.mockResolvedValueOnce('abcde');

      return Promise.all([
        expect(fn()).resolves.toBe('abcde'),
        expect(fn()).resolves.toBe('abcd'),
      ]);
    });

    it('supports mocking rejectable async functions', () => {
      const err = new Error('rejected');
      const fn = moduleMocker.fn();
      fn.mockRejectedValue(err);

      const promise = fn();

      expect(promise).toBeInstanceOf(Promise);

      return expect(promise).rejects.toBe(err);
    });

    it('supports mocking rejectable async functions only once', () => {
      const defaultErr = new Error('default rejected');
      const err = new Error('rejected');
      const fn = moduleMocker.fn();
      fn.mockRejectedValue(defaultErr);
      fn.mockRejectedValueOnce(err);

      return Promise.all([
        expect(fn()).rejects.toBe(err),
        expect(fn()).rejects.toBe(defaultErr),
      ]);
    });

    describe('return values', () => {
      it('tracks return values', () => {
        const fn = moduleMocker.fn(x => x * 2);

        expect(fn.mock.results).toEqual([]);

        fn(1);
        fn(2);

        expect(fn.mock.results).toEqual([
          {
            type: 'return',
            value: 2,
          },
          {
            type: 'return',
            value: 4,
          },
        ]);
      });

      it('tracks mocked return values', () => {
        const fn = moduleMocker.fn(x => x * 2);
        fn.mockReturnValueOnce('MOCKED!');

        fn(1);
        fn(2);

        expect(fn.mock.results).toEqual([
          {
            type: 'return',
            value: 'MOCKED!',
          },
          {
            type: 'return',
            value: 4,
          },
        ]);
      });

      it('supports resetting return values', () => {
        const fn = moduleMocker.fn(x => x * 2);

        expect(fn.mock.results).toEqual([]);

        fn(1);
        fn(2);

        expect(fn.mock.results).toEqual([
          {
            type: 'return',
            value: 2,
          },
          {
            type: 'return',
            value: 4,
          },
        ]);

        fn.mockReset();

        expect(fn.mock.results).toEqual([]);
      });
    });

    it('tracks thrown errors without interfering with other tracking', () => {
      const error = new Error('ODD!');
      const fn = moduleMocker.fn((x, y) => {
        // multiply params
        const result = x * y;

        if (result % 2 === 1) {
          // throw error if result is odd
          throw error;
        } else {
          return result;
        }
      });

      expect(fn(2, 4)).toBe(8);

      // Mock still throws the error even though it was internally
      // caught and recorded
      expect(() => {
        fn(3, 5);
      }).toThrow('ODD!');

      expect(fn(6, 3)).toBe(18);

      // All call args tracked
      expect(fn.mock.calls).toEqual([
        [2, 4],
        [3, 5],
        [6, 3],
      ]);
      // Results are tracked
      expect(fn.mock.results).toEqual([
        {
          type: 'return',
          value: 8,
        },
        {
          type: 'throw',
          value: error,
        },
        {
          type: 'return',
          value: 18,
        },
      ]);
    });

    it(`a call that throws undefined is tracked properly`, () => {
      const fn = moduleMocker.fn(() => {
        // eslint-disable-next-line no-throw-literal
        throw undefined;
      });

      try {
        fn(2, 4);
      } catch {
        // ignore error
      }

      // All call args tracked
      expect(fn.mock.calls).toEqual([[2, 4]]);
      // Results are tracked
      expect(fn.mock.results).toEqual([
        {
          type: 'throw',
          value: undefined,
        },
      ]);
    });

    it('results of recursive calls are tracked properly', () => {
      // sums up all integers from 0 -> value, using recursion
      const fn = moduleMocker.fn(value => {
        if (value === 0) {
          return 0;
        } else {
          return value + fn(value - 1);
        }
      });

      fn(4);

      // All call args tracked
      expect(fn.mock.calls).toEqual([[4], [3], [2], [1], [0]]);
      // Results are tracked
      // (in correct order of calls, rather than order of returns)
      expect(fn.mock.results).toEqual([
        {
          type: 'return',
          value: 10,
        },
        {
          type: 'return',
          value: 6,
        },
        {
          type: 'return',
          value: 3,
        },
        {
          type: 'return',
          value: 1,
        },
        {
          type: 'return',
          value: 0,
        },
      ]);
    });

    it('test results of recursive calls from within the recursive call', () => {
      // sums up all integers from 0 -> value, using recursion
      const fn = moduleMocker.fn(value => {
        if (value === 0) {
          return 0;
        } else {
          const recursiveResult = fn(value - 1);

          if (value === 3) {
            // All recursive calls have been made at this point.
            expect(fn.mock.calls).toEqual([[4], [3], [2], [1], [0]]);
            // But only the last 3 calls have returned at this point.
            expect(fn.mock.results).toEqual([
              {
                type: 'incomplete',
                value: undefined,
              },
              {
                type: 'incomplete',
                value: undefined,
              },
              {
                type: 'return',
                value: 3,
              },
              {
                type: 'return',
                value: 1,
              },
              {
                type: 'return',
                value: 0,
              },
            ]);
          }

          return value + recursiveResult;
        }
      });

      fn(4);
    });

    it('call mockClear inside recursive mock', () => {
      // sums up all integers from 0 -> value, using recursion
      const fn = moduleMocker.fn(value => {
        if (value === 3) {
          fn.mockClear();
        }

        if (value === 0) {
          return 0;
        } else {
          return value + fn(value - 1);
        }
      });

      fn(3);

      // All call args (after the call that cleared the mock) are tracked
      expect(fn.mock.calls).toEqual([[2], [1], [0]]);
      // Results (after the call that cleared the mock) are tracked
      expect(fn.mock.results).toEqual([
        {
          type: 'return',
          value: 3,
        },
        {
          type: 'return',
          value: 1,
        },
        {
          type: 'return',
          value: 0,
        },
      ]);
    });

    describe('invocationCallOrder', () => {
      it('tracks invocationCallOrder made by mocks', () => {
        const fn1 = moduleMocker.fn();
        expect(fn1.mock.invocationCallOrder).toEqual([]);

        fn1(1, 2, 3);
        expect(fn1.mock.invocationCallOrder[0]).toBe(1);

        fn1('a', 'b', 'c');
        expect(fn1.mock.invocationCallOrder[1]).toBe(2);

        fn1(1, 2, 3);
        expect(fn1.mock.invocationCallOrder[2]).toBe(3);

        const fn2 = moduleMocker.fn();
        expect(fn2.mock.invocationCallOrder).toEqual([]);

        fn2('d', 'e', 'f');
        expect(fn2.mock.invocationCallOrder[0]).toBe(4);

        fn2(4, 5, 6);
        expect(fn2.mock.invocationCallOrder[1]).toBe(5);
      });

      it('supports clearing mock invocationCallOrder', () => {
        const fn = moduleMocker.fn();
        expect(fn.mock.invocationCallOrder).toEqual([]);

        fn(1, 2, 3);
        expect(fn.mock.invocationCallOrder).toEqual([1]);

        fn.mockReturnValue('abcd');

        fn.mockClear();
        expect(fn.mock.invocationCallOrder).toEqual([]);

        fn('a', 'b', 'c');
        expect(fn.mock.invocationCallOrder).toEqual([2]);

        expect(fn()).toEqual('abcd');
      });

      it('supports clearing all mocks invocationCallOrder', () => {
        const fn1 = moduleMocker.fn();
        fn1.mockImplementation(() => 'abcd');

        fn1(1, 2, 3);
        expect(fn1.mock.invocationCallOrder).toEqual([1]);

        const fn2 = moduleMocker.fn();

        fn2.mockReturnValue('abcde');
        fn2('a', 'b', 'c', 'd');
        expect(fn2.mock.invocationCallOrder).toEqual([2]);

        moduleMocker.clearAllMocks();
        expect(fn1.mock.invocationCallOrder).toEqual([]);
        expect(fn2.mock.invocationCallOrder).toEqual([]);
        expect(fn1()).toEqual('abcd');
        expect(fn2()).toEqual('abcde');
      });

      it('handles a property called `prototype`', () => {
        const mock = moduleMocker.generateFromMetadata(
          moduleMocker.getMetadata({prototype: 1}),
        );

        expect(mock.prototype).toBe(1);
      });
    });
  });

  describe('getMockImplementation', () => {
    it('should mock calls to a mock function', () => {
      const mockFn = moduleMocker.fn();

      mockFn.mockImplementation(() => 'Foo');

      expect(typeof mockFn.getMockImplementation()).toBe('function');
      expect(mockFn.getMockImplementation()()).toBe('Foo');
    });
  });

  describe('mockImplementationOnce', () => {
    it('should mock constructor', () => {
      const mock1 = jest.fn();
      const mock2 = jest.fn();
      const Module = jest.fn(() => ({someFn: mock1}));
      const testFn = function () {
        const m = new Module();
        m.someFn();
      };

      Module.mockImplementationOnce(() => ({someFn: mock2}));

      testFn();
      expect(mock2).toHaveBeenCalled();
      expect(mock1).not.toHaveBeenCalled();
      testFn();
      expect(mock1).toHaveBeenCalled();
    });

    it('should mock single call to a mock function', () => {
      const mockFn = moduleMocker.fn();

      mockFn
        .mockImplementationOnce(() => 'Foo')
        .mockImplementationOnce(() => 'Bar');

      expect(mockFn()).toBe('Foo');
      expect(mockFn()).toBe('Bar');
      expect(mockFn()).toBeUndefined();
    });

    it('should fallback to default mock function when no specific mock is available', () => {
      const mockFn = moduleMocker.fn();

      mockFn
        .mockImplementationOnce(() => 'Foo')
        .mockImplementationOnce(() => 'Bar')
        .mockImplementation(() => 'Default');

      expect(mockFn()).toBe('Foo');
      expect(mockFn()).toBe('Bar');
      expect(mockFn()).toBe('Default');
      expect(mockFn()).toBe('Default');
    });
  });

  test('mockReturnValue does not override mockImplementationOnce', () => {
    const mockFn = jest
      .fn()
      .mockReturnValue(1)
      .mockImplementationOnce(() => 2);
    expect(mockFn()).toBe(2);
    expect(mockFn()).toBe(1);
  });

  test('mockImplementation resets the mock', () => {
    const fn = jest.fn();
    expect(fn()).toBeUndefined();
    fn.mockReturnValue('returnValue');
    fn.mockImplementation(() => 'foo');
    expect(fn()).toBe('foo');
  });

  it('should recognize a mocked function', () => {
    const mockFn = moduleMocker.fn();

    expect(moduleMocker.isMockFunction(() => {})).toBe(false);
    expect(moduleMocker.isMockFunction(mockFn)).toBe(true);
  });

  test('default mockName is jest.fn()', () => {
    const fn = jest.fn();
    expect(fn.getMockName()).toBe('jest.fn()');
  });

  test('mockName sets the mock name', () => {
    const fn = jest.fn();
    fn.mockName('myMockFn');
    expect(fn.getMockName()).toBe('myMockFn');
  });

  test('mockName gets reset by mockReset', () => {
    const fn = jest.fn();
    expect(fn.getMockName()).toBe('jest.fn()');
    fn.mockName('myMockFn');
    expect(fn.getMockName()).toBe('myMockFn');
    fn.mockReset();
    expect(fn.getMockName()).toBe('jest.fn()');
  });

  test('mockName gets reset by mockRestore', () => {
    const fn = jest.fn();
    expect(fn.getMockName()).toBe('jest.fn()');
    fn.mockName('myMockFn');
    expect(fn.getMockName()).toBe('myMockFn');
    fn.mockRestore();
    expect(fn.getMockName()).toBe('jest.fn()');
  });

  test('mockName is not reset by mockClear', () => {
    const fn = jest.fn(() => false);
    fn.mockName('myMockFn');
    expect(fn.getMockName()).toBe('myMockFn');
    fn.mockClear();
    expect(fn.getMockName()).toBe('myMockFn');
  });

  describe('spyOn', () => {
    it('should work', () => {
      let isOriginalCalled = false;
      let originalCallThis;
      let originalCallArguments;
      const obj = {
        method() {
          isOriginalCalled = true;
          originalCallThis = this;
          originalCallArguments = arguments;
        },
      };

      const spy = moduleMocker.spyOn(obj, 'method');

      const thisArg = {this: true};
      const firstArg = {first: true};
      const secondArg = {second: true};
      obj.method.call(thisArg, firstArg, secondArg);
      expect(isOriginalCalled).toBe(true);
      expect(originalCallThis).toBe(thisArg);
      expect(originalCallArguments.length).toBe(2);
      expect(originalCallArguments[0]).toBe(firstArg);
      expect(originalCallArguments[1]).toBe(secondArg);
      expect(spy).toHaveBeenCalled();

      isOriginalCalled = false;
      originalCallThis = null;
      originalCallArguments = null;
      spy.mockRestore();
      obj.method.call(thisArg, firstArg, secondArg);
      expect(isOriginalCalled).toBe(true);
      expect(originalCallThis).toBe(thisArg);
      expect(originalCallArguments.length).toBe(2);
      expect(originalCallArguments[0]).toBe(firstArg);
      expect(originalCallArguments[1]).toBe(secondArg);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should throw on invalid input', () => {
      expect(() => {
        moduleMocker.spyOn(null, 'method');
      }).toThrow();
      expect(() => {
        moduleMocker.spyOn({}, 'method');
      }).toThrow();
      expect(() => {
        moduleMocker.spyOn({method: 10}, 'method');
      }).toThrow();
    });

    it('supports restoring all spies', () => {
      let methodOneCalls = 0;
      let methodTwoCalls = 0;
      const obj = {
        methodOne() {
          methodOneCalls++;
        },
        methodTwo() {
          methodTwoCalls++;
        },
      };

      const spy1 = moduleMocker.spyOn(obj, 'methodOne');
      const spy2 = moduleMocker.spyOn(obj, 'methodTwo');

      // First, we call with the spies: both spies and both original functions
      // should be called.
      obj.methodOne();
      obj.methodTwo();
      expect(methodOneCalls).toBe(1);
      expect(methodTwoCalls).toBe(1);
      expect(spy1.mock.calls.length).toBe(1);
      expect(spy2.mock.calls.length).toBe(1);

      moduleMocker.restoreAllMocks();

      // Then, after resetting all mocks, we call methods again. Only the real
      // methods should bump their count, not the spies.
      obj.methodOne();
      obj.methodTwo();
      expect(methodOneCalls).toBe(2);
      expect(methodTwoCalls).toBe(2);
      expect(spy1.mock.calls.length).toBe(1);
      expect(spy2.mock.calls.length).toBe(1);
    });

    it('should work with getters', () => {
      let isOriginalCalled = false;
      let originalCallThis;
      let originalCallArguments;
      const obj = {
        get method() {
          return function () {
            isOriginalCalled = true;
            originalCallThis = this;
            originalCallArguments = arguments;
          };
        },
      };

      const spy = moduleMocker.spyOn(obj, 'method');

      const thisArg = {this: true};
      const firstArg = {first: true};
      const secondArg = {second: true};
      obj.method.call(thisArg, firstArg, secondArg);
      expect(isOriginalCalled).toBe(true);
      expect(originalCallThis).toBe(thisArg);
      expect(originalCallArguments.length).toBe(2);
      expect(originalCallArguments[0]).toBe(firstArg);
      expect(originalCallArguments[1]).toBe(secondArg);
      expect(spy).toHaveBeenCalled();

      isOriginalCalled = false;
      originalCallThis = null;
      originalCallArguments = null;
      spy.mockRestore();
      obj.method.call(thisArg, firstArg, secondArg);
      expect(isOriginalCalled).toBe(true);
      expect(originalCallThis).toBe(thisArg);
      expect(originalCallArguments.length).toBe(2);
      expect(originalCallArguments[0]).toBe(firstArg);
      expect(originalCallArguments[1]).toBe(secondArg);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('spyOnProperty', () => {
    it('should work - getter', () => {
      let isOriginalCalled = false;
      let originalCallThis;
      let originalCallArguments;
      const obj = {
        get method() {
          return function () {
            isOriginalCalled = true;
            originalCallThis = this;
            originalCallArguments = arguments;
          };
        },
      };

      const spy = moduleMocker.spyOn(obj, 'method', 'get');

      const thisArg = {this: true};
      const firstArg = {first: true};
      const secondArg = {second: true};
      obj.method.call(thisArg, firstArg, secondArg);
      expect(isOriginalCalled).toBe(true);
      expect(originalCallThis).toBe(thisArg);
      expect(originalCallArguments.length).toBe(2);
      expect(originalCallArguments[0]).toBe(firstArg);
      expect(originalCallArguments[1]).toBe(secondArg);
      expect(spy).toHaveBeenCalled();

      isOriginalCalled = false;
      originalCallThis = null;
      originalCallArguments = null;
      spy.mockRestore();
      obj.method.call(thisArg, firstArg, secondArg);
      expect(isOriginalCalled).toBe(true);
      expect(originalCallThis).toBe(thisArg);
      expect(originalCallArguments.length).toBe(2);
      expect(originalCallArguments[0]).toBe(firstArg);
      expect(originalCallArguments[1]).toBe(secondArg);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should work - setter', () => {
      const obj = {
        _property: false,
        set property(value) {
          this._property = value;
        },
        get property() {
          return this._property;
        },
      };

      const spy = moduleMocker.spyOn(obj, 'property', 'set');
      obj.property = true;
      expect(spy).toHaveBeenCalled();
      expect(obj.property).toBe(true);
      obj.property = false;
      spy.mockRestore();
      obj.property = true;
      expect(spy).not.toHaveBeenCalled();
      expect(obj.property).toBe(true);
    });

    it('should throw on invalid input', () => {
      expect(() => {
        moduleMocker.spyOn(null, 'method');
      }).toThrow();
      expect(() => {
        moduleMocker.spyOn({}, 'method');
      }).toThrow();
      expect(() => {
        moduleMocker.spyOn({method: 10}, 'method');
      }).toThrow();
    });

    it('supports restoring all spies', () => {
      let methodOneCalls = 0;
      let methodTwoCalls = 0;
      const obj = {
        get methodOne() {
          return function () {
            methodOneCalls++;
          };
        },
        get methodTwo() {
          return function () {
            methodTwoCalls++;
          };
        },
      };

      const spy1 = moduleMocker.spyOn(obj, 'methodOne', 'get');
      const spy2 = moduleMocker.spyOn(obj, 'methodTwo', 'get');

      // First, we call with the spies: both spies and both original functions
      // should be called.
      obj.methodOne();
      obj.methodTwo();
      expect(methodOneCalls).toBe(1);
      expect(methodTwoCalls).toBe(1);
      expect(spy1.mock.calls.length).toBe(1);
      expect(spy2.mock.calls.length).toBe(1);

      moduleMocker.restoreAllMocks();

      // Then, after resetting all mocks, we call methods again. Only the real
      // methods should bump their count, not the spies.
      obj.methodOne();
      obj.methodTwo();
      expect(methodOneCalls).toBe(2);
      expect(methodTwoCalls).toBe(2);
      expect(spy1.mock.calls.length).toBe(1);
      expect(spy2.mock.calls.length).toBe(1);
    });

    it('should work with getters on the prototype chain', () => {
      let isOriginalCalled = false;
      let originalCallThis;
      let originalCallArguments;
      const prototype = {
        get method() {
          return function () {
            isOriginalCalled = true;
            originalCallThis = this;
            originalCallArguments = arguments;
          };
        },
      };
      const obj = Object.create(prototype, {});

      const spy = moduleMocker.spyOn(obj, 'method', 'get');

      const thisArg = {this: true};
      const firstArg = {first: true};
      const secondArg = {second: true};
      obj.method.call(thisArg, firstArg, secondArg);
      expect(isOriginalCalled).toBe(true);
      expect(originalCallThis).toBe(thisArg);
      expect(originalCallArguments.length).toBe(2);
      expect(originalCallArguments[0]).toBe(firstArg);
      expect(originalCallArguments[1]).toBe(secondArg);
      expect(spy).toHaveBeenCalled();

      isOriginalCalled = false;
      originalCallThis = null;
      originalCallArguments = null;
      spy.mockRestore();
      obj.method.call(thisArg, firstArg, secondArg);
      expect(isOriginalCalled).toBe(true);
      expect(originalCallThis).toBe(thisArg);
      expect(originalCallArguments.length).toBe(2);
      expect(originalCallArguments[0]).toBe(firstArg);
      expect(originalCallArguments[1]).toBe(secondArg);
      expect(spy).not.toHaveBeenCalled();
    });

    test('should work with setters on the prototype chain', () => {
      const prototype = {
        _property: false,
        set property(value) {
          this._property = value;
        },
        get property() {
          return this._property;
        },
      };
      const obj = Object.create(prototype, {});

      const spy = moduleMocker.spyOn(obj, 'property', 'set');
      obj.property = true;
      expect(spy).toHaveBeenCalled();
      expect(obj.property).toBe(true);
      obj.property = false;
      spy.mockRestore();
      obj.property = true;
      expect(spy).not.toHaveBeenCalled();
      expect(obj.property).toBe(true);
    });

    it('supports restoring all spies on the prototype chain', () => {
      let methodOneCalls = 0;
      let methodTwoCalls = 0;
      const prototype = {
        get methodOne() {
          return function () {
            methodOneCalls++;
          };
        },
        get methodTwo() {
          return function () {
            methodTwoCalls++;
          };
        },
      };
      const obj = Object.create(prototype, {});

      const spy1 = moduleMocker.spyOn(obj, 'methodOne', 'get');
      const spy2 = moduleMocker.spyOn(obj, 'methodTwo', 'get');

      // First, we call with the spies: both spies and both original functions
      // should be called.
      obj.methodOne();
      obj.methodTwo();
      expect(methodOneCalls).toBe(1);
      expect(methodTwoCalls).toBe(1);
      expect(spy1.mock.calls.length).toBe(1);
      expect(spy2.mock.calls.length).toBe(1);

      moduleMocker.restoreAllMocks();

      // Then, after resetting all mocks, we call methods again. Only the real
      // methods should bump their count, not the spies.
      obj.methodOne();
      obj.methodTwo();
      expect(methodOneCalls).toBe(2);
      expect(methodTwoCalls).toBe(2);
      expect(spy1.mock.calls.length).toBe(1);
      expect(spy2.mock.calls.length).toBe(1);
    });
  });
});

test('`fn` and `spyOn` do not throw', () => {
  expect(() => {
    fn();
    spyOn({apple: () => {}}, 'apple');
  }).not.toThrow();
});
