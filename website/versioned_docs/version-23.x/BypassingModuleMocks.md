---
id: version-23.x-bypassing-module-mocks
title: Bypassing module mocks
original_id: bypassing-module-mocks
---

Jest allows you to mock out whole modules in your tests, which can be useful for testing your code is calling functions from that module correctly. However, sometimes you may want to use parts of a mocked module in your _test file_, in which case you want to access the original implementation, rather than a mocked version.

Consider writing a test case for this `createUser` function:

```javascript
// createUser.js
import fetch from 'node-fetch';

export const createUser = async () => {
  const response = await fetch('http://website.com/users', {method: 'POST'});
  const userId = await response.text();
  return userId;
};
```

Your test will want to mock the `fetch` function so that we can be sure that it gets called without actually making the network request. However, you'll also need to mock the return value of `fetch` with a `Response` (wrapped in a `Promise`), as our function uses it to grab the created user's ID. So you might initially try writing a test like this:

```javascript
jest.mock('node-fetch');

import fetch, {Response} from 'node-fetch';

import {createUser} from './createUser';

test('createUser calls fetch with the right args and returns the user id', async () => {
  fetch.mockReturnValue(Promise.resolve(new Response('4')));

  const userId = await createUser();

  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('http://website.com/users', {
    method: 'POST',
  });
  expect(userId).toBe('4');
});
```

However, if you ran that test you would find that the `createUser` function would fail, throwing the error: `TypeError: response.text is not a function`. This is because the `Response` class you've imported from `node-fetch` has been mocked (due to the `jest.mock` call at the top of the test file) so it no longer behaves the way it should.

To get around problems like this, Jest provides the `jest.requireActual` helper. To make the above test work, make the following change to the imports in the test file:

```javascript
// BEFORE
jest.mock('node-fetch');
import fetch, {Response} from 'node-fetch';
```

```javascript
// AFTER
jest.mock('node-fetch');
import fetch from 'node-fetch';
const {Response} = jest.requireActual('node-fetch');
```

This allows your test file to import the actual `Response` object from `node-fetch`, rather than a mocked version. This means the test will now pass correctly.
