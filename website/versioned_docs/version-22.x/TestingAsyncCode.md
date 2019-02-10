---
id: version-22.x-asynchronous
title: Testing Asynchronous Code
original_id: asynchronous
---

It's common in JavaScript for code to run asynchronously. When you have code that runs asynchronously, Jest needs to know when the code it is testing has completed, before it can move on to another test. Jest has several ways to handle this.

## Callbacks

The most common asynchronous pattern is callbacks.

For example, let's say that you have a `fetchData(callback)` function that fetches some data and calls `callback(data)` when it is complete. You want to test that this returned data is just the string `'peanut butter'`.

By default, Jest tests complete once they reach the end of their execution. That means this test will _not_ work as intended:

```js
// Don't do this!
test('the data is peanut butter', () => {
  function callback(data) {
    expect(data).toBe('peanut butter');
  }

  fetchData(callback);
});
```

The problem is that the test will complete as soon as `fetchData` completes, before ever calling the callback.

There is an alternate form of `test` that fixes this. Instead of putting the test in a function with an empty argument, use a single argument called `done`. Jest will wait until the `done` callback is called before finishing the test.

```js
test('the data is peanut butter', done => {
  function callback(data) {
    expect(data).toBe('peanut butter');
    done();
  }

  fetchData(callback);
});
```

If `done()` is never called, the test will fail, which is what you want to happen.

## Promises

If your code uses promises, there is a simpler way to handle asynchronous tests. Just return a promise from your test, and Jest will wait for that promise to resolve. If the promise is rejected, the test will automatically fail.

For example, let's say that `fetchData`, instead of using a callback, returns a promise that is supposed to resolve to the string `'peanut butter'`. We could test it with:

```js
test('the data is peanut butter', () => {
  expect.assertions(1);
  return fetchData().then(data => {
    expect(data).toBe('peanut butter');
  });
});
```

Be sure to return the promise - if you omit this `return` statement, your test will complete before `fetchData` completes.

If you expect a promise to be rejected use the `.catch` method. Make sure to add `expect.assertions` to verify that a certain number of assertions are called. Otherwise a fulfilled promise would not fail the test.

```js
test('the fetch fails with an error', () => {
  expect.assertions(1);
  return fetchData().catch(e => expect(e).toMatch('error'));
});
```

## `.resolves` / `.rejects`

##### available in Jest **20.0.0+**

You can also use the `.resolves` matcher in your expect statement, and Jest will wait for that promise to resolve. If the promise is rejected, the test will automatically fail.

```js
test('the data is peanut butter', () => {
  expect.assertions(1);
  return expect(fetchData()).resolves.toBe('peanut butter');
});
```

Be sure to return the assertion—if you omit this `return` statement, your test will complete before `fetchData` completes.

If you expect a promise to be rejected use the `.rejects` matcher. It works analogically to the `.resolves` matcher. If the promise is fulfilled, the test will automatically fail.

```js
test('the fetch fails with an error', () => {
  expect.assertions(1);
  return expect(fetchData()).rejects.toMatch('error');
});
```

## Async/Await

Alternatively, you can use `async` and `await` in your tests. To write an async test, just use the `async` keyword in front of the function passed to `test`. For example, the same `fetchData` scenario can be tested with:

```js
test('the data is peanut butter', async () => {
  expect.assertions(1);
  const data = await fetchData();
  expect(data).toBe('peanut butter');
});

test('the fetch fails with an error', async () => {
  expect.assertions(1);
  try {
    await fetchData();
  } catch (e) {
    expect(e).toMatch('error');
  }
});
```

Of course, you can combine `async` and `await` with `.resolves` or `.rejects` (available in Jest **20.0.0+**).

```js
test('the data is peanut butter', async () => {
  expect.assertions(1);
  await expect(fetchData()).resolves.toBe('peanut butter');
});

test('the fetch fails with an error', async () => {
  expect.assertions(1);
  await expect(fetchData()).rejects.toMatch('error');
});
```

In these cases, `async` and `await` are effectively just syntactic sugar for the same logic as the promises example uses.

None of these forms is particularly superior to the others, and you can mix and match them across a codebase or even in a single file. It just depends on which style makes your tests simpler.
