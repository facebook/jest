---
id: tutorial-async
title: An Async Example
---

First, enable Babel support in Jest as documented in the [Getting Started](GettingStarted.md#using-babel) guide.

Let's implement a simple module that fetches user data from an API and returns the user name.

```js
// user.js
import request from './request';

export function getUserName(userID) {
  return request('/users/' + userID).then(user => user.name);
}
```

In the above implementation we expect the `request.js` module to return a promise. We chain a call to `then` to receive the user name.

Now imagine an implementation of `request.js` that goes to the network and fetches some user data:

```js
// request.js
const http = require('http');

export default function request(url) {
  return new Promise(resolve => {
    // This is an example of an http request, for example to fetch
    // user data from an API.
    // This module is being mocked in __mocks__/request.js
    http.get({path: url}, response => {
      let data = '';
      response.on('data', _data => (data += _data));
      response.on('end', () => resolve(data));
    });
  });
}
```

Because we don't want to go to the network in our test, we are going to create a manual mock for our `request.js` module in the `__mocks__` folder (the folder is case-sensitive, `__MOCKS__` will not work). It could look something like this:

```js
// __mocks__/request.js
const users = {
  4: {name: 'Mark'},
  5: {name: 'Paul'},
};

export default function request(url) {
  return new Promise((resolve, reject) => {
    const userID = parseInt(url.substr('/users/'.length), 10);
    process.nextTick(() =>
      users[userID]
        ? resolve(users[userID])
        : reject({
            error: 'User with ' + userID + ' not found.',
          }),
    );
  });
}
```

Now let's write a test for our async functionality.

```js
// __tests__/user-test.js
jest.mock('../request');

import * as user from '../user';

// The assertion for a promise must be returned.
it('works with promises', () => {
  expect.assertions(1);
  return user.getUserName(4).then(data => expect(data).toEqual('Mark'));
});
```

We call `jest.mock('../request')` to tell Jest to use our manual mock. `it` expects the return value to be a Promise that is going to be resolved. You can chain as many Promises as you like and call `expect` at any time, as long as you return a Promise at the end.

## `.resolves`

There is a less verbose way using `resolves` to unwrap the value of a fulfilled promise together with any other matcher. If the promise is rejected, the assertion will fail.

```js
it('works with resolves', () => {
  expect.assertions(1);
  return expect(user.getUserName(5)).resolves.toEqual('Paul');
});
```

## `async`/`await`

Writing tests using the `async`/`await` syntax is easy. Here is how you'd write the same examples from before:

```js
// async/await can be used.
it('works with async/await', async () => {
  expect.assertions(1);
  const data = await user.getUserName(4);
  expect(data).toEqual('Mark');
});

// async/await can also be used with `.resolves`.
it('works with async/await and resolves', async () => {
  expect.assertions(1);
  await expect(user.getUserName(5)).resolves.toEqual('Paul');
});
```

To enable async/await in your project, install [`@babel/preset-env`](https://babeljs.io/docs/en/babel-preset-env) and enable the feature in your `babel.config.js` file.

## Error handling

Errors can be handled using the `.catch` method. Make sure to add `expect.assertions` to verify that a certain number of assertions are called. Otherwise a fulfilled promise would not fail the test:

```js
// Testing for async errors using Promise.catch.
test('tests error with promises', () => {
  expect.assertions(1);
  return user.getUserName(2).catch(e =>
    expect(e).toEqual({
      error: 'User with 2 not found.',
    }),
  );
});

// Or using async/await.
it('tests error with async/await', async () => {
  expect.assertions(1);
  try {
    await user.getUserName(1);
  } catch (e) {
    expect(e).toEqual({
      error: 'User with 1 not found.',
    });
  }
});
```

## `.rejects`

The`.rejects` helper works like the `.resolves` helper. If the promise is fulfilled, the test will automatically fail.

```js
// Testing for async errors using `.rejects`.
it('tests error with rejects', () => {
  expect.assertions(1);
  return expect(user.getUserName(3)).rejects.toEqual({
    error: 'User with 3 not found.',
  });
});

// Or using async/await with `.rejects`.
it('tests error with async/await and rejects', async () => {
  expect.assertions(1);
  await expect(user.getUserName(3)).rejects.toEqual({
    error: 'User with 3 not found.',
  });
});
```

The code for this example is available at [examples/async](https://github.com/facebook/jest/tree/master/examples/async).

If you'd like to test timers, like `setTimeout`, take a look at the [Timer mocks](TimerMocks.md) documentation.
