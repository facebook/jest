---
id: timer-mocks
title: Timer Mocks
---

The native timer functions (i.e., `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`) are less than ideal for a testing environment since they depend on real time to elapse. Jest can swap out timers with functions that allow you to control the passage of time. [Great Scott!](https://www.youtube.com/watch?v=QZoJ2Pt27BY)

```javascript
// timerGame.js
'use strict';

function timerGame(callback) {
  console.log('Ready....go!');
  setTimeout(() => {
    console.log("Time's up -- stop!");
    callback && callback();
  }, 1000);
}

module.exports = timerGame;
```

```javascript
// __tests__/timerGame-test.js
'use strict';

jest.useFakeTimers();

test('waits 1 second before ending the game', () => {
  const timerGame = require('../timerGame');
  timerGame();

  expect(setTimeout).toHaveBeenCalledTimes(1);
  expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
});
```

Here we enable fake timers by calling `jest.useFakeTimers()`. This mocks out `setTimeout` and other timer functions with mock functions. Timers can be restored to their normal behavior with `jest.useRealTimers()`.

While you can call `jest.useFakeTimers()` or `jest.useRealTimers()` from anywhere (top level, inside an `it` block, etc.), it is a **global operation** and will affect other tests within the same file. Additionally, you need to call `jest.useFakeTimers()` to reset internal counters before each test. If you plan to not use fake timers in all your tests, you will want to clean up manually, as otherwise the faked timers will leak across tests:

```javascript
afterEach(() => {
  jest.useRealTimers();
});

test('do something with fake timers', () => {
  jest.useFakeTimers();
  // ...
});

test('do something with real timers', () => {
  // ...
});
```

## Run All Timers

Another test we might want to write for this module is one that asserts that the callback is called after 1 second. To do this, we're going to use Jest's timer control APIs to fast-forward time right in the middle of the test:

```javascript
jest.useFakeTimers();

test('calls the callback after 1 second', () => {
  const timerGame = require('../timerGame');
  const callback = jest.fn();

  timerGame(callback);

  // At this point in time, the callback should not have been called yet
  expect(callback).not.toBeCalled();

  // Fast-forward until all timers have been executed
  jest.runAllTimers();

  // Now our callback should have been called!
  expect(callback).toBeCalled();
  expect(callback).toHaveBeenCalledTimes(1);
});
```

## Run Pending Timers

There are also scenarios where you might have a recursive timer -- that is a timer that sets a new timer in its own callback. For these, running all the timers would be an endless loop… so something like `jest.runAllTimers()` is not desirable. For these cases you might use `jest.runOnlyPendingTimers()`:

```javascript
// infiniteTimerGame.js
'use strict';

function infiniteTimerGame(callback) {
  console.log('Ready....go!');

  setTimeout(() => {
    console.log("Time's up! 10 seconds before the next game starts...");
    callback && callback();

    // Schedule the next game in 10 seconds
    setTimeout(() => {
      infiniteTimerGame(callback);
    }, 10000);
  }, 1000);
}

module.exports = infiniteTimerGame;
```

```javascript
// __tests__/infiniteTimerGame-test.js
'use strict';

jest.useFakeTimers();

describe('infiniteTimerGame', () => {
  test('schedules a 10-second timer after 1 second', () => {
    const infiniteTimerGame = require('../infiniteTimerGame');
    const callback = jest.fn();

    infiniteTimerGame(callback);

    // At this point in time, there should have been a single call to
    // setTimeout to schedule the end of the game in 1 second.
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);

    // Fast forward and exhaust only currently pending timers
    // (but not any new timers that get created during that process)
    jest.runOnlyPendingTimers();

    // At this point, our 1-second timer should have fired it's callback
    expect(callback).toBeCalled();

    // And it should have created a new timer to start the game over in
    // 10 seconds
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 10000);
  });
});
```

## Advance Timers by Time

Another possibility is use `jest.advanceTimersByTime(msToRun)`. When this API is called, all timers are advanced by `msToRun` milliseconds. All pending "macro-tasks" that have been queued via setTimeout() or setInterval(), and would be executed during this time frame, will be executed. Additionally, if those macro-tasks schedule new macro-tasks that would be executed within the same time frame, those will be executed until there are no more macro-tasks remaining in the queue that should be run within msToRun milliseconds.

```javascript
// timerGame.js
'use strict';

function timerGame(callback) {
  console.log('Ready....go!');
  setTimeout(() => {
    console.log("Time's up -- stop!");
    callback && callback();
  }, 1000);
}

module.exports = timerGame;
```

```javascript
// __tests__/timerGame-test.js
jest.useFakeTimers();

it('calls the callback after 1 second via advanceTimersByTime', () => {
  const timerGame = require('../timerGame');
  const callback = jest.fn();

  timerGame(callback);

  // At this point in time, the callback should not have been called yet
  expect(callback).not.toBeCalled();

  // Fast-forward until all timers have been executed
  jest.advanceTimersByTime(1000);

  // Now our callback should have been called!
  expect(callback).toBeCalled();
  expect(callback).toHaveBeenCalledTimes(1);
});
```

Lastly, it may occasionally be useful in some tests to be able to clear all of the pending timers. For this, we have `jest.clearAllTimers()`.

The code for this example is available at [examples/timer](https://github.com/facebook/jest/tree/master/examples/timer).
