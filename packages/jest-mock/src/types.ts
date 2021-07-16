type ArgsType<T> = T extends (...args: infer A) => any ? A : never;
type RejectedValue<T> = T extends PromiseLike<any> ? any : never;
type ResolvedValue<T> = T extends PromiseLike<infer U> ? U | T : never;

interface Constructable {
  new (...args: Array<any>): any;
}

interface Mock<T = any, Y extends Array<any> = any>
  extends Function,
    MockInstance<T, Y> {
  new (...args: Y): T;
  (...args: Y): T;
}

interface SpyInstance<T = any, Y extends Array<any> = any>
  extends MockInstance<T, Y> {}

/**
 * Wrap a function with mock definitions
 *
 * @example
 *
 *  import { myFunction } from "./library";
 *  jest.mock("./library");
 *
 *  const mockMyFunction = myFunction as jest.MockedFunction<typeof myFunction>;
 *  expect(mockMyFunction.mock.calls[0][0]).toBe(42);
 */
type MockedFunction<T extends (...args: Array<any>) => any> = MockInstance<
  ReturnType<T>,
  ArgsType<T>
> &
  T;

/**
 * Wrap a class with mock definitions
 *
 * @example
 *
 *  import { MyClass } from "./libary";
 *  jest.mock("./library");
 *
 *  const mockedMyClass = MyClass as jest.MockedClass<MyClass>;
 *
 *  expect(mockedMyClass.mock.calls[0][0]).toBe(42); // Constructor calls
 *  expect(mockedMyClass.prototype.myMethod.mock.calls[0][0]).toBe(42); // Method calls
 */

type MockedClass<T extends Constructable> = MockInstance<
  InstanceType<T>,
  T extends new (...args: infer P) => any ? P : never
> & {
  prototype: T extends {prototype: any} ? Mocked<T['prototype']> : never;
} & T;

/**
 * Wrap an object or a module with mock definitions
 *
 * @example
 *
 *  jest.mock("../api");
 *  import * as api from "../api";
 *
 *  const mockApi = api as jest.Mocked<typeof api>;
 *  api.MyApi.prototype.myApiMethod.mockImplementation(() => "test");
 */
type Mocked<T> = {
  [P in keyof T]: T[P] extends (...args: Array<any>) => any
    ? MockInstance<ReturnType<T[P]>, ArgsType<T[P]>>
    : T[P] extends Constructable
    ? MockedClass<T[P]>
    : T[P];
} &
  T;

interface MockInstance<T, Y extends Array<any>> {
  /** Returns the mock name string set by calling `mockFn.mockName(value)`. */
  getMockName(): string;
  /** Provides access to the mock's metadata */
  mock: MockContext<T, Y>;
  /**
   * Resets all information stored in the mockFn.mock.calls and mockFn.mock.instances arrays.
   *
   * Often this is useful when you want to clean up a mock's usage data between two assertions.
   *
   * Beware that `mockClear` will replace `mockFn.mock`, not just `mockFn.mock.calls` and `mockFn.mock.instances`.
   * You should therefore avoid assigning mockFn.mock to other variables, temporary or not, to make sure you
   * don't access stale data.
   */
  mockClear(): void;
  /**
   * Resets all information stored in the mock, including any initial implementation and mock name given.
   *
   * This is useful when you want to completely restore a mock back to its initial state.
   *
   * Beware that `mockReset` will replace `mockFn.mock`, not just `mockFn.mock.calls` and `mockFn.mock.instances`.
   * You should therefore avoid assigning mockFn.mock to other variables, temporary or not, to make sure you
   * don't access stale data.
   */
  mockReset(): void;
  /**
   * Does everything that `mockFn.mockReset()` does, and also restores the original (non-mocked) implementation.
   *
   * This is useful when you want to mock functions in certain test cases and restore the original implementation in others.
   *
   * Beware that `mockFn.mockRestore` only works when mock was created with `jest.spyOn`. Thus you have to take care of restoration
   * yourself when manually assigning `jest.fn()`.
   *
   * The [`restoreMocks`](https://jestjs.io/docs/en/configuration.html#restoremocks-boolean) configuration option is available
   * to restore mocks automatically between tests.
   */
  mockRestore(): void;
  /**
   * Accepts a function that should be used as the implementation of the mock. The mock itself will still record
   * all calls that go into and instances that come from itself – the only difference is that the implementation
   * will also be executed when the mock is called.
   *
   * Note: `jest.fn(implementation)` is a shorthand for `jest.fn().mockImplementation(implementation)`.
   */
  mockImplementation(fn?: (...args: Y) => T): this;
  /**
   * Accepts a function that will be used as an implementation of the mock for one call to the mocked function.
   * Can be chained so that multiple function calls produce different results.
   *
   * @example
   *
   * const myMockFn = jest
   *   .fn()
   *    .mockImplementationOnce(cb => cb(null, true))
   *    .mockImplementationOnce(cb => cb(null, false));
   *
   * myMockFn((err, val) => console.log(val)); // true
   *
   * myMockFn((err, val) => console.log(val)); // false
   */
  mockImplementationOnce(fn: (...args: Y) => T): this;
  /** Sets the name of the mock`. */
  mockName(name: string): this;
  /**
   * Just a simple sugar function for:
   *
   * @example
   *
   *   jest.fn(function() {
   *     return this;
   *   });
   */
  mockReturnThis(): this;
  /**
   * Accepts a value that will be returned whenever the mock function is called.
   *
   * @example
   *
   * const mock = jest.fn();
   * mock.mockReturnValue(42);
   * mock(); // 42
   * mock.mockReturnValue(43);
   * mock(); // 43
   */
  mockReturnValue(value: T): this;
  /**
   * Accepts a value that will be returned for one call to the mock function. Can be chained so that
   * successive calls to the mock function return different values. When there are no more
   * `mockReturnValueOnce` values to use, calls will return a value specified by `mockReturnValue`.
   *
   * @example
   *
   * const myMockFn = jest.fn()
   *   .mockReturnValue('default')
   *   .mockReturnValueOnce('first call')
   *   .mockReturnValueOnce('second call');
   *
   * // 'first call', 'second call', 'default', 'default'
   * console.log(myMockFn(), myMockFn(), myMockFn(), myMockFn());
   *
   */
  mockReturnValueOnce(value: T): this;
  /**
   * Simple sugar function for: `jest.fn().mockImplementation(() => Promise.resolve(value));`
   */
  mockResolvedValue(value: ResolvedValue<T>): this;
  /**
   * Simple sugar function for: `jest.fn().mockImplementationOnce(() => Promise.resolve(value));`
   *
   * @example
   *
   * test('async test', async () => {
   *  const asyncMock = jest
   *    .fn()
   *    .mockResolvedValue('default')
   *    .mockResolvedValueOnce('first call')
   *    .mockResolvedValueOnce('second call');
   *
   *  await asyncMock(); // first call
   *  await asyncMock(); // second call
   *  await asyncMock(); // default
   *  await asyncMock(); // default
   * });
   *
   */
  mockResolvedValueOnce(value: ResolvedValue<T>): this;
  /**
   * Simple sugar function for: `jest.fn().mockImplementation(() => Promise.reject(value));`
   *
   * @example
   *
   * test('async test', async () => {
   *   const asyncMock = jest.fn().mockRejectedValue(new Error('Async error'));
   *
   *   await asyncMock(); // throws "Async error"
   * });
   */
  mockRejectedValue(value: RejectedValue<T>): this;

  /**
   * Simple sugar function for: `jest.fn().mockImplementationOnce(() => Promise.reject(value));`
   *
   * @example
   *
   * test('async test', async () => {
   *  const asyncMock = jest
   *    .fn()
   *    .mockResolvedValueOnce('first call')
   *    .mockRejectedValueOnce(new Error('Async error'));
   *
   *  await asyncMock(); // first call
   *  await asyncMock(); // throws "Async error"
   * });
   *
   */
  mockRejectedValueOnce(value: RejectedValue<T>): this;
}

/**
 * Represents the result of a single call to a mock function with a return value.
 */
interface MockResultReturn<T> {
  type: 'return';
  value: T;
}
/**
 * Represents the result of a single incomplete call to a mock function.
 */
interface MockResultIncomplete {
  type: 'incomplete';
  value: undefined;
}
/**
 * Represents the result of a single call to a mock function with a thrown error.
 */
interface MockResultThrow {
  type: 'throw';
  value: any;
}

type MockResult<T> =
  | MockResultReturn<T>
  | MockResultThrow
  | MockResultIncomplete;

interface MockContext<T, Y extends Array<any>> {
  calls: Array<Y>;
  instances: Array<T>;
  invocationCallOrder: Array<number>;
  /**
   * List of results of calls to the mock function.
   */
  results: Array<MockResult<T>>;
}
