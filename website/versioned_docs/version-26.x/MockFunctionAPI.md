---
id: mock-function-api
title: Mock Functions
---

Mock functions are also known as "spies", because they let you spy on the behavior of a function that is called indirectly by some other code, rather than only testing the output. You can create a mock function with `jest.fn()`. If no implementation is given, the mock function will return `undefined` when invoked.

## Methods

import TOCInline from "@theme/TOCInline"

<TOCInline toc={toc.slice(1)}/>

---

## Reference

### `mockFn.getMockName()`

Returns the mock name string set by calling `mockFn.mockName(value)`.

### `mockFn.mock.calls`

An array containing the call arguments of all calls that have been made to this mock function. Each item in the array is an array of arguments that were passed during the call.

For example: A mock function `f` that has been called twice, with the arguments `f('arg1', 'arg2')`, and then with the arguments `f('arg3', 'arg4')`, would have a `mock.calls` array that looks like this:

```js
[
  ['arg1', 'arg2'],
  ['arg3', 'arg4'],
];
```

### `mockFn.mock.results`

An array containing the results of all calls that have been made to this mock function. Each entry in this array is an object containing a `type` property, and a `value` property. `type` will be one of the following:

- `'return'` - Indicates that the call completed by returning normally.
- `'throw'` - Indicates that the call completed by throwing a value.
- `'incomplete'` - Indicates that the call has not yet completed. This occurs if you test the result from within the mock function itself, or from within a function that was called by the mock.

The `value` property contains the value that was thrown or returned. `value` is undefined when `type === 'incomplete'`.

For example: A mock function `f` that has been called three times, returning `'result1'`, throwing an error, and then returning `'result2'`, would have a `mock.results` array that looks like this:

```js
[
  {
    type: 'return',
    value: 'result1',
  },
  {
    type: 'throw',
    value: {
      /* Error instance */
    },
  },
  {
    type: 'return',
    value: 'result2',
  },
];
```

### `mockFn.mock.instances`

An array that contains all the object instances that have been instantiated from this mock function using `new`.

For example: A mock function that has been instantiated twice would have the following `mock.instances` array:

```js
const mockFn = jest.fn();

const a = new mockFn();
const b = new mockFn();

mockFn.mock.instances[0] === a; // true
mockFn.mock.instances[1] === b; // true
```

### `mockFn.mockClear()`

Resets all information stored in the [`mockFn.mock.calls`](#mockfnmockcalls), [`mockFn.mock.instances`](#mockfnmockinstances) and [`mockFn.mock.results`](#mockfnmockresults) arrays.

Often this is useful when you want to clean up a mock's usage data between two assertions.

Beware that `mockClear` will replace `mockFn.mock`, not just these three properties! You should, therefore, avoid assigning `mockFn.mock` to other variables, temporary or not, to make sure you don't access stale data.

The [`clearMocks`](configuration#clearmocks-boolean) configuration option is available to clear mocks automatically between tests.

### `mockFn.mockReset()`

Does everything that [`mockFn.mockClear()`](#mockfnmockclear) does, and also removes any mocked return values or implementations.

This is useful when you want to completely reset a _mock_ back to its initial state. (Note that resetting a _spy_ will result in a function with no return value).

### `mockFn.mockRestore()`

Does everything that [`mockFn.mockReset()`](#mockfnmockreset) does, and also restores the original (non-mocked) implementation.

This is useful when you want to mock functions in certain test cases and restore the original implementation in others.

Beware that `mockFn.mockRestore` only works when the mock was created with `jest.spyOn`. Thus you have to take care of restoration yourself when manually assigning `jest.fn()`.

The [`restoreMocks`](configuration#restoremocks-boolean) configuration option is available to restore mocks automatically between tests.

### `mockFn.mockImplementation(fn)`

Accepts a function that should be used as the implementation of the mock. The mock itself will still record all calls that go into and instances that come from itself – the only difference is that the implementation will also be executed when the mock is called.

_Note: `jest.fn(implementation)` is a shorthand for `jest.fn().mockImplementation(implementation)`._

For example:

```js
const mockFn = jest.fn().mockImplementation(scalar => 42 + scalar);
// or: jest.fn(scalar => 42 + scalar);

const a = mockFn(0);
const b = mockFn(1);

a === 42; // true
b === 43; // true

mockFn.mock.calls[0][0] === 0; // true
mockFn.mock.calls[1][0] === 1; // true
```

`mockImplementation` can also be used to mock class constructors:

```js
// SomeClass.js
module.exports = class SomeClass {
  m(a, b) {}
};

// OtherModule.test.js
jest.mock('./SomeClass'); // this happens automatically with automocking
const SomeClass = require('./SomeClass');
const mMock = jest.fn();
SomeClass.mockImplementation(() => {
  return {
    m: mMock,
  };
});

const some = new SomeClass();
some.m('a', 'b');
console.log('Calls to m: ', mMock.mock.calls);
```

### `mockFn.mockImplementationOnce(fn)`

Accepts a function that will be used as an implementation of the mock for one call to the mocked function. Can be chained so that multiple function calls produce different results.

```js
const myMockFn = jest
  .fn()
  .mockImplementationOnce(cb => cb(null, true))
  .mockImplementationOnce(cb => cb(null, false));

myMockFn((err, val) => console.log(val)); // true

myMockFn((err, val) => console.log(val)); // false
```

When the mocked function runs out of implementations defined with mockImplementationOnce, it will execute the default implementation set with `jest.fn(() => defaultValue)` or `.mockImplementation(() => defaultValue)` if they were called:

```js
const myMockFn = jest
  .fn(() => 'default')
  .mockImplementationOnce(() => 'first call')
  .mockImplementationOnce(() => 'second call');

// 'first call', 'second call', 'default', 'default'
console.log(myMockFn(), myMockFn(), myMockFn(), myMockFn());
```

### `mockFn.mockName(value)`

Accepts a string to use in test result output in place of "jest.fn()" to indicate which mock function is being referenced.

For example:

```js
const mockFn = jest.fn().mockName('mockedFunction');
// mockFn();
expect(mockFn).toHaveBeenCalled();
```

Will result in this error:

```
expect(mockedFunction).toHaveBeenCalled()

Expected mock function "mockedFunction" to have been called, but it was not called.
```

### `mockFn.mockReturnThis()`

Syntactic sugar function for:

```js
jest.fn(function () {
  return this;
});
```

### `mockFn.mockReturnValue(value)`

Accepts a value that will be returned whenever the mock function is called.

```js
const mock = jest.fn();
mock.mockReturnValue(42);
mock(); // 42
mock.mockReturnValue(43);
mock(); // 43
```

### `mockFn.mockReturnValueOnce(value)`

Accepts a value that will be returned for one call to the mock function. Can be chained so that successive calls to the mock function return different values. When there are no more `mockReturnValueOnce` values to use, calls will return a value specified by `mockReturnValue`.

```js
const myMockFn = jest
  .fn()
  .mockReturnValue('default')
  .mockReturnValueOnce('first call')
  .mockReturnValueOnce('second call');

// 'first call', 'second call', 'default', 'default'
console.log(myMockFn(), myMockFn(), myMockFn(), myMockFn());
```

### `mockFn.mockResolvedValue(value)`

Syntactic sugar function for:

```js
jest.fn().mockImplementation(() => Promise.resolve(value));
```

Useful to mock async functions in async tests:

```js
test('async test', async () => {
  const asyncMock = jest.fn().mockResolvedValue(43);

  await asyncMock(); // 43
});
```

### `mockFn.mockResolvedValueOnce(value)`

Syntactic sugar function for:

```js
jest.fn().mockImplementationOnce(() => Promise.resolve(value));
```

Useful to resolve different values over multiple async calls:

```js
test('async test', async () => {
  const asyncMock = jest
    .fn()
    .mockResolvedValue('default')
    .mockResolvedValueOnce('first call')
    .mockResolvedValueOnce('second call');

  await asyncMock(); // first call
  await asyncMock(); // second call
  await asyncMock(); // default
  await asyncMock(); // default
});
```

### `mockFn.mockRejectedValue(value)`

Syntactic sugar function for:

```js
jest.fn().mockImplementation(() => Promise.reject(value));
```

Useful to create async mock functions that will always reject:

```js
test('async test', async () => {
  const asyncMock = jest.fn().mockRejectedValue(new Error('Async error'));

  await asyncMock(); // throws "Async error"
});
```

### `mockFn.mockRejectedValueOnce(value)`

Syntactic sugar function for:

```js
jest.fn().mockImplementationOnce(() => Promise.reject(value));
```

Example usage:

```js
test('async test', async () => {
  const asyncMock = jest
    .fn()
    .mockResolvedValueOnce('first call')
    .mockRejectedValueOnce(new Error('Async error'));

  await asyncMock(); // first call
  await asyncMock(); // throws "Async error"
});
```

## TypeScript

Jest itself is written in [TypeScript](https://www.typescriptlang.org).

If you are using [Create React App](https://create-react-app.dev) then the [TypeScript template](https://create-react-app.dev/docs/adding-typescript/) has everything you need to start writing tests in TypeScript.

Otherwise, please see our [Getting Started](GettingStarted.md#using-typescript) guide for to get setup with TypeScript.

You can see an example of using Jest with TypeScript in our [GitHub repository](https://github.com/facebook/jest/tree/master/examples/typescript).

### `jest.MockedFunction`

> `jest.MockedFunction` is available in the `@types/jest` module from version `24.9.0`.

The following examples will assume you have an understanding of how [Jest mock functions work with JavaScript](MockFunctions.md).

You can use `jest.MockedFunction` to represent a function that has been replaced by a Jest mock.

Example using [automatic `jest.mock`](JestObjectAPI.md#jestmockmodulename-factory-options):

```ts
// Assume `add` is imported and used within `calculate`.
import add from './add';
import calculate from './calc';

jest.mock('./add');

// Our mock of `add` is now fully typed
const mockAdd = add as jest.MockedFunction<typeof add>;

test('calculate calls add', () => {
  calculate('Add', 1, 2);

  expect(mockAdd).toBeCalledTimes(1);
  expect(mockAdd).toBeCalledWith(1, 2);
});
```

Example using [`jest.fn`](JestObjectAPI.md#jestfnimplementation):

```ts
// Here `add` is imported for its type
import add from './add';
import calculate from './calc';

test('calculate calls add', () => {
  // Create a new mock that can be used in place of `add`.
  const mockAdd = jest.fn() as jest.MockedFunction<typeof add>;

  // Note: You can use the `jest.fn` type directly like this if you want:
  // const mockAdd = jest.fn<ReturnType<typeof add>, Parameters<typeof add>>();
  // `jest.MockedFunction` is a more friendly shortcut.

  // Now we can easily set up mock implementations.
  // All the `.mock*` API can now give you proper types for `add`.
  // https://jestjs.io/docs/mock-function-api

  // `.mockImplementation` can now infer that `a` and `b` are `number`
  // and that the returned value is a `number`.
  mockAdd.mockImplementation((a, b) => {
    // Yes, this mock is still adding two numbers but imagine this
    // was a complex function we are mocking.
    return a + b;
  });

  // `mockAdd` is properly typed and therefore accepted by
  // anything requiring `add`.
  calculate(mockAdd, 1, 2);

  expect(mockAdd).toBeCalledTimes(1);
  expect(mockAdd).toBeCalledWith(1, 2);
});
```

### `jest.MockedClass`

> `jest.MockedClass` is available in the `@types/jest` module from version `24.9.0`.

The following examples will assume you have an understanding of how [Jest mock classes work with JavaScript](Es6ClassMocks.md).

You can use `jest.MockedClass` to represent a class that has been replaced by a Jest mock.

Converting the [ES6 Class automatic mock example](Es6ClassMocks.md#automatic-mock) would look like this:

```ts
import SoundPlayer from '../sound-player';
import SoundPlayerConsumer from '../sound-player-consumer';

jest.mock('../sound-player'); // SoundPlayer is now a mock constructor

const SoundPlayerMock = SoundPlayer as jest.MockedClass<typeof SoundPlayer>;

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  SoundPlayerMock.mockClear();
});

it('We can check if the consumer called the class constructor', () => {
  const soundPlayerConsumer = new SoundPlayerConsumer();
  expect(SoundPlayerMock).toHaveBeenCalledTimes(1);
});

it('We can check if the consumer called a method on the class instance', () => {
  // Show that mockClear() is working:
  expect(SoundPlayerMock).not.toHaveBeenCalled();

  const soundPlayerConsumer = new SoundPlayerConsumer();
  // Constructor should have been called again:
  expect(SoundPlayerMock).toHaveBeenCalledTimes(1);

  const coolSoundFileName = 'song.mp3';
  soundPlayerConsumer.playSomethingCool();

  // mock.instances is available with automatic mocks:
  const mockSoundPlayerInstance = SoundPlayerMock.mock.instances[0];

  // However, it will not allow access to `.mock` in TypeScript as it
  // is returning `SoundPlayer`. Instead, you can check the calls to a
  // method like this fully typed:
  expect(SoundPlayerMock.prototype.playSoundFile.mock.calls[0][0]).toEqual(
    coolSoundFileName,
  );
  // Equivalent to above check:
  expect(SoundPlayerMock.prototype.playSoundFile).toHaveBeenCalledWith(
    coolSoundFileName,
  );
  expect(SoundPlayerMock.prototype.playSoundFile).toHaveBeenCalledTimes(1);
});
```
