---
id: version-22.x-jest-object
title: The Jest Object
original_id: jest-object
---

The `jest` object is automatically in scope within every test file. The methods in the `jest` object help create mocks and let you control Jest's overall behavior.

## Methods

- [`jest.clearAllTimers()`](#jestclearalltimers)
- [`jest.disableAutomock()`](#jestdisableautomock)
- [`jest.enableAutomock()`](#jestenableautomock)
- [`jest.fn(implementation)`](#jestfnimplementation)
- [`jest.isMockFunction(fn)`](#jestismockfunctionfn)
- [`jest.genMockFromModule(moduleName)`](#jestgenmockfrommodulemodulename)
- [`jest.mock(moduleName, factory, options)`](#jestmockmodulename-factory-options)
- [`jest.unmock(moduleName)`](#jestunmockmodulename)
- [`jest.doMock(moduleName, factory, options)`](#jestdomockmodulename-factory-options)
- [`jest.dontMock(moduleName)`](#jestdontmockmodulename)
- [`jest.clearAllMocks()`](#jestclearallmocks)
- [`jest.resetAllMocks()`](#jestresetallmocks)
- [`jest.restoreAllMocks()`](#jestrestoreallmocks)
- [`jest.resetModules()`](#jestresetmodules)
- [`jest.runAllTicks()`](#jestrunallticks)
- [`jest.runAllTimers()`](#jestrunalltimers)
- [`jest.advanceTimersByTime(msToRun)`](#jestadvancetimersbytimemstorun)
- [`jest.runOnlyPendingTimers()`](#jestrunonlypendingtimers)
- [`jest.requireActual()`](#jestrequireactual)
- [`jest.requireMock()`](#jestrequiremock)
- [`jest.setMock(moduleName, moduleExports)`](#jestsetmockmodulename-moduleexports)
- [`jest.setTimeout(timeout)`](#jestsettimeouttimeout)
- [`jest.useFakeTimers()`](#jestusefaketimers)
- [`jest.useRealTimers()`](#jestuserealtimers)
- [`jest.spyOn(object, methodName)`](#jestspyonobject-methodname)
- [`jest.spyOn(object, methodName, accessType?)`](#jestspyonobject-methodname-accesstype)

---

## Reference

### `jest.clearAllTimers()`

Removes any pending timers from the timer system.

This means, if any timers have been scheduled (but have not yet executed), they will be cleared and will never have the opportunity to execute in the future.

### `jest.disableAutomock()`

Disables automatic mocking in the module loader.

> See `automock` section of [configuration](Configuration.md#automock-boolean) for more information

After this method is called, all `require()`s will return the real versions of each module (rather than a mocked version).

Jest configuration:

```json
"automock": true
```

Example:

```js
// utils.js
export default {
  authorize: () => {
    return 'token';
  },
};
```

```js
// __tests__/disableAutomocking.js
import utils from '../utils';

jest.disableAutomock();

test('original implementation', () => {
  // now we have the original implementation,
  // even if we set the automocking in a jest configuration
  expect(utils.authorize()).toBe('token');
});
```

This is usually useful when you have a scenario where the number of dependencies you want to mock is far less than the number of dependencies that you don't. For example, if you're writing a test for a module that uses a large number of dependencies that can be reasonably classified as "implementation details" of the module, then you likely do not want to mock them.

Examples of dependencies that might be considered "implementation details" are things ranging from language built-ins (e.g. Array.prototype methods) to highly common utility methods (e.g. underscore/lo-dash, array utilities etc) and entire libraries like React.js.

Returns the `jest` object for chaining.

_Note: this method was previously called `autoMockOff`. When using `babel-jest`, calls to `disableAutomock` will automatically be hoisted to the top of the code block. Use `autoMockOff` if you want to explicitly avoid this behavior._

### `jest.enableAutomock()`

Enables automatic mocking in the module loader.

Returns the `jest` object for chaining.

> See `automock` section of [configuration](Configuration.md#automock-boolean) for more information

Example:

```js
// utils.js
export default {
  authorize: () => {
    return 'token';
  },
  isAuthorized: secret => secret === 'wizard',
};
```

```js
// __tests__/disableAutomocking.js
jest.enableAutomock();

import utils from '../utils';

test('original implementation', () => {
  // now we have the mocked implementation,
  expect(utils.authorize._isMockFunction).toBeTruthy();
  expect(utils.isAuthorized._isMockFunction).toBeTruthy();
});
```

_Note: this method was previously called `autoMockOn`. When using `babel-jest`, calls to `enableAutomock` will automatically be hoisted to the top of the code block. Use `autoMockOn` if you want to explicitly avoid this behavior._

### `jest.fn(implementation)`

Returns a new, unused [mock function](MockFunctionAPI.md). Optionally takes a mock implementation.

```js
const mockFn = jest.fn();
mockFn();
expect(mockFn).toHaveBeenCalled();

// With a mock implementation:
const returnsTrue = jest.fn(() => true);
console.log(returnsTrue()); // true;
```

### `jest.isMockFunction(fn)`

Determines if the given function is a mocked function.

### `jest.genMockFromModule(moduleName)`

Given the name of a module, use the automatic mocking system to generate a mocked version of the module for you.

This is useful when you want to create a [manual mock](ManualMocks.md) that extends the automatic mock's behavior.

Example:

```js
// utils.js
export default {
  authorize: () => {
    return 'token';
  },
  isAuthorized: secret => secret === 'wizard',
};
```

```js
// __tests__/genMockFromModule.test.js
const utils = jest.genMockFromModule('../utils').default;
utils.isAuthorized = jest.fn(secret => secret === 'not wizard');

test('implementation created by jest.genMockFromModule', () => {
  expect(utils.authorize.mock).toBeTruthy();
  expect(utils.isAuthorized('not wizard')).toEqual(true);
});
```

### `jest.mock(moduleName, factory, options)`

Mocks a module with an auto-mocked version when it is being required. `factory` and `options` are optional. For example:

```js
// banana.js
module.exports = () => 'banana';

// __tests__/test.js
jest.mock('../banana');

const banana = require('../banana'); // banana will be explicitly mocked.

banana(); // will return 'undefined' because the function is auto-mocked.
```

The second argument can be used to specify an explicit module factory that is being run instead of using Jest's automocking feature:

```js
jest.mock('../moduleName', () => {
  return jest.fn(() => 42);
});

// This runs the function specified as second argument to `jest.mock`.
const moduleName = require('../moduleName');
moduleName(); // Will return '42';
```

The third argument can be used to create virtual mocks – mocks of modules that don't exist anywhere in the system:

```js
jest.mock(
  '../moduleName',
  () => {
    /*
     * Custom implementation of a module that doesn't exist in JS,
     * like a generated module or a native module in react-native.
     */
  },
  {virtual: true},
);
```

_Warning: Importing a module in a setup file (as specified by `setupTestFrameworkScriptFile`) will prevent mocking for the module in question, as well as all the modules that it imports._

Modules that are mocked with `jest.mock` are mocked only for the file that calls `jest.mock`. Another file that imports the module will get the original implementation even if it runs after the test file that mocks the module.

Returns the `jest` object for chaining.

### `jest.unmock(moduleName)`

Indicates that the module system should never return a mocked version of the specified module from `require()` (e.g. that it should always return the real module).

The most common use of this API is for specifying the module a given test intends to be testing (and thus doesn't want automatically mocked).

Returns the `jest` object for chaining.

### `jest.doMock(moduleName, factory, options)`

When using `babel-jest`, calls to `mock` will automatically be hoisted to the top of the code block. Use this method if you want to explicitly avoid this behavior.

One example when this is useful is when you want to mock a module differently within the same file:

```js
beforeEach(() => {
  jest.resetModules();
});

test('moduleName 1', () => {
  jest.doMock('../moduleName', () => {
    return jest.fn(() => 1);
  });
  const moduleName = require('../moduleName');
  expect(moduleName()).toEqual(1);
});

test('moduleName 2', () => {
  jest.doMock('../moduleName', () => {
    return jest.fn(() => 2);
  });
  const moduleName = require('../moduleName');
  expect(moduleName()).toEqual(2);
});
```

Returns the `jest` object for chaining.

### `jest.dontMock(moduleName)`

When using `babel-jest`, calls to `unmock` will automatically be hoisted to the top of the code block. Use this method if you want to explicitly avoid this behavior.

Returns the `jest` object for chaining.

### `jest.clearAllMocks()`

Clears the `mock.calls` and `mock.instances` properties of all mocks. Equivalent to calling `.mockClear()` on every mocked function.

Returns the `jest` object for chaining.

### `jest.resetAllMocks()`

Resets the state of all mocks. Equivalent to calling `.mockReset()` on every mocked function.

Returns the `jest` object for chaining.

### `jest.restoreAllMocks()`

Restores all mocks back to their original value. Equivalent to calling `.mockRestore` on every mocked function. Beware that `jest.restoreAllMocks()` only works when mock was created with `jest.spyOn`; other mocks will require you to manually restore them.

### `jest.resetModules()`

Resets the module registry - the cache of all required modules. This is useful to isolate modules where local state might conflict between tests.

Example:

```js
const sum1 = require('../sum');
jest.resetModules();
const sum2 = require('../sum');
sum1 === sum2;
// > false (Both sum modules are separate "instances" of the sum module.)
```

Example in a test:

```js
beforeEach(() => {
  jest.resetModules();
});

test('works', () => {
  const sum = require('../sum');
});

test('works too', () => {
  const sum = require('../sum');
  // sum is a different copy of the sum module from the previous test.
});
```

Returns the `jest` object for chaining.

### `jest.runAllTicks()`

Exhausts the **micro**-task queue (usually interfaced in node via `process.nextTick`).

When this API is called, all pending micro-tasks that have been queued via `process.nextTick` will be executed. Additionally, if those micro-tasks themselves schedule new micro-tasks, those will be continually exhausted until there are no more micro-tasks remaining in the queue.

### `jest.runAllTimers()`

Exhausts the **macro**-task queue (i.e., all tasks queued by `setTimeout()`, `setInterval()`, and `setImmediate()`).

When this API is called, all pending "macro-tasks" that have been queued via `setTimeout()` or `setInterval()` will be executed. Additionally if those macro-tasks themselves schedule new macro-tasks, those will be continually exhausted until there are no more macro-tasks remaining in the queue.

This is often useful for synchronously executing setTimeouts during a test in order to synchronously assert about some behavior that would only happen after the `setTimeout()` or `setInterval()` callbacks executed. See the [Timer mocks](TimerMocks.md) doc for more information.

### `jest.runAllImmediates()`

Exhausts all tasks queued by `setImmediate()`.

### `jest.advanceTimersByTime(msToRun)`

Also under the alias: `.runTimersToTime()`

Executes only the macro task queue (i.e. all tasks queued by `setTimeout()` or `setInterval()` and `setImmediate()`).

When this API is called, all timers are advanced by `msToRun` milliseconds. All pending "macro-tasks" that have been queued via `setTimeout()` or `setInterval()`, and would be executed within this time frame will be executed. Additionally if those macro-tasks schedule new macro-tasks that would be executed within the same time frame, those will be executed until there are no more macro-tasks remaining in the queue, that should be run within `msToRun` milliseconds.

### `jest.runOnlyPendingTimers()`

Executes only the macro-tasks that are currently pending (i.e., only the tasks that have been queued by `setTimeout()` or `setInterval()` up to this point). If any of the currently pending macro-tasks schedule new macro-tasks, those new tasks will not be executed by this call.

This is useful for scenarios such as one where the module being tested schedules a `setTimeout()` whose callback schedules another `setTimeout()` recursively (meaning the scheduling never stops). In these scenarios, it's useful to be able to run forward in time by a single step at a time.

### `jest.requireActual(moduleName)`

Returns the actual module instead of a mock, bypassing all checks on whether the module should receive a mock implementation or not.

### `jest.requireMock(moduleName)`

Returns a mock module instead of the actual module, bypassing all checks on whether the module should be required normally or not.

### `jest.setMock(moduleName, moduleExports)`

Explicitly supplies the mock object that the module system should return for the specified module.

On occasion there are times where the automatically generated mock the module system would normally provide you isn't adequate enough for your testing needs. Normally under those circumstances you should write a [manual mock](ManualMocks.md) that is more adequate for the module in question. However, on extremely rare occasions, even a manual mock isn't suitable for your purposes and you need to build the mock yourself inside your test.

In these rare scenarios you can use this API to manually fill the slot in the module system's mock-module registry.

Returns the `jest` object for chaining.

_Note It is recommended to use [`jest.mock()`](#jestmockmodulename-factory-options) instead. The `jest.mock` API's second argument is a module factory instead of the expected exported module object._

### `jest.setTimeout(timeout)`

Set the default timeout interval for tests and before/after hooks in milliseconds.

_Note: The default timeout interval is 5 seconds if this method is not called._

_Note: The method must be called after the test framework is installed in the environment and before the test runs. A good place to do this is in the `setupTestFrameworkScriptFile`._

Example:

```js
jest.setTimeout(1000); // 1 second
```

### `jest.useFakeTimers()`

Instructs Jest to use fake versions of the standard timer functions (`setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `nextTick`, `setImmediate` and `clearImmediate`).

Returns the `jest` object for chaining.

### `jest.useRealTimers()`

Instructs Jest to use the real versions of the standard timer functions.

Returns the `jest` object for chaining.

### `jest.spyOn(object, methodName)`

Creates a mock function similar to `jest.fn` but also tracks calls to `object[methodName]`. Returns a Jest mock function.

_Note: By default, `jest.spyOn` also calls the **spied** method. This is different behavior from most other test libraries. If you want to overwrite the original function, you can use `jest.spyOn(object, methodName).mockImplementation(() => customImplementation)` or `object[methodName] = jest.fn(() => customImplementation);`_

Example:

```js
const video = {
  play() {
    return true;
  },
};

module.exports = video;
```

Example test:

```js
const video = require('./video');

test('plays video', () => {
  const spy = jest.spyOn(video, 'play');
  const isPlaying = video.play();

  expect(spy).toHaveBeenCalled();
  expect(isPlaying).toBe(true);

  spy.mockReset();
  spy.mockRestore();
});
```

### `jest.spyOn(object, methodName, accessType?)`

Since Jest 22.1.0+, the `jest.spyOn` method takes an optional third argument of `accessType` that can be either `'get'` or `'set'`, which proves to be useful when you want to spy on a getter or a setter, respectively.

Example:

```js
const video = {
  // it's a getter!
  get play() {
    return true;
  },
};

module.exports = video;

const audio = {
  _volume: false,
  // it's a setter!
  set volume(value) {
    this._volume = value;
  },
  get volume() {
    return this._volume;
  },
};

module.exports = video;
```

Example test:

```js
const video = require('./video');

test('plays video', () => {
  const spy = jest.spyOn(video, 'play', 'get'); // we pass 'get'
  const isPlaying = video.play;

  expect(spy).toHaveBeenCalled();
  expect(isPlaying).toBe(true);

  spy.mockReset();
  spy.mockRestore();
});

test('plays audio', () => {
  const spy = jest.spyOn(video, 'play', 'set'); // we pass 'set'
  video.volume = 100;

  expect(spy).toHaveBeenCalled();
  expect(video.volume).toBe(100);

  spy.mockReset();
  spy.mockRestore();
});
```
