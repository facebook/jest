---
id: promise-mocks
title: Promise Mocks
---

Can be used to supplement the [timer mocks](TimerMocks.md). Timer mocks work by running timer callbacks synchronously, in the same order they normally would, but without waiting. Promise mocks can be used with timer mocks to skip wait times and still run micro-tasks and macro-tasks in the same order they would run in the Node.js environment.

```javascript
// promiseGame.js
'use strict';

function promiseGame(callback) {
  console.log('Ready....go!');
  Promise.resolve(0).then(() => {
    console.log('Promise is fulfilled -- stop!');
    callback && callback();
  });
}

module.exports = promiseGame;
```

```javascript
// __tests__/promiseGame.js
'use strict';

jest.useFakePromises();

test('runs all queued promises', () => {
  const promiseGame = require('../promiseGame');
  const callback = jest.fn();

  promiseGame(callback);

  // At this point, the promise callback should not have been called yet
  expect(callback).not.toBeCalled();

  // Fast-forward until all promises are completed
  jest.runAllPromises();

  // Now our callback should have been called!
  expect(callback).toBeCalled();
  expect(callback).toHaveBeenCalledTimes(1);
});
```

Here we enable fake promises by calling `jest.useFakePromises();`. This mocks out the Promise class and its entire API. `jest.runAllPromises();` is used to synchronously run all queued promises

The timer mock API uses a promise mock delegate to run all queued promises and nextTick callbacks if fake promises are being used.
