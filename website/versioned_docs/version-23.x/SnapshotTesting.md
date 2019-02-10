---
id: version-23.x-snapshot-testing
title: Snapshot Testing
original_id: snapshot-testing
---

Snapshot tests are a very useful tool whenever you want to make sure your UI does not change unexpectedly.

A typical snapshot test case for a mobile app renders a UI component, takes a screenshot, then compares it to a reference image stored alongside the test. The test will fail if the two images do not match: either the change is unexpected, or the screenshot needs to be updated to the new version of the UI component.

## Snapshot Testing with Jest

A similar approach can be taken when it comes to testing your React components. Instead of rendering the graphical UI, which would require building the entire app, you can use a test renderer to quickly generate a serializable value for your React tree. Consider this [example test](https://github.com/facebook/jest/blob/master/examples/snapshot/__tests__/link.react.test.js) for a simple [Link component](https://github.com/facebook/jest/blob/master/examples/snapshot/Link.react.js):

```javascript
import React from 'react';
import Link from '../Link.react';
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  const tree = renderer
    .create(<Link page="http://www.facebook.com">Facebook</Link>)
    .toJSON();
  expect(tree).toMatchSnapshot();
});
```

The first time this test is run, Jest creates a [snapshot file](https://github.com/facebook/jest/blob/master/examples/snapshot/__tests__/__snapshots__/link.react.test.js.snap) that looks like this:

```javascript
exports[`renders correctly 1`] = `
<a
  className="normal"
  href="http://www.facebook.com"
  onMouseEnter={[Function]}
  onMouseLeave={[Function]}
>
  Facebook
</a>
`;
```

The snapshot artifact should be committed alongside code changes, and reviewed as part of your code review process. Jest uses [pretty-format](https://github.com/facebook/jest/tree/master/packages/pretty-format) to make snapshots human-readable during code review. On subsequent test runs Jest will simply compare the rendered output with the previous snapshot. If they match, the test will pass. If they don't match, either the test runner found a bug in your code (in this case, it's `<Link>` component) that should be fixed, or the implementation has changed and the snapshot needs to be updated.

> Note: The snapshot is directly scoped to the data you render – in our example it's `<Link />` component with page prop passed to it. This implies that even if any other file has missing props (Say, `App.js`) in the `<Link />` component, it will still pass the test as the test doesn't know the usage of `<Link />` component and it's scoped only to the `Link.react.js`. Also, Rendering the same component with different props in other snapshot test will not affect the first one, as the tests don't know about each other.

More information on how snapshot testing works and why we built it can be found on the [release blog post](https://jestjs.io/blog/2016/07/27/jest-14.html). We recommend reading [this blog post](http://benmccormick.org/2016/09/19/testing-with-jest-snapshots-first-impressions/) to get a good sense of when you should use snapshot testing. We also recommend watching this [egghead video](https://egghead.io/lessons/javascript-use-jest-s-snapshot-testing-feature?pl=testing-javascript-with-jest-a36c4074) on Snapshot Testing with Jest.

### Updating Snapshots

It's straightforward to spot when a snapshot test fails after a bug has been introduced. When that happens, go ahead and fix the issue and make sure your snapshot tests are passing again. Now, let's talk about the case when a snapshot test is failing due to an intentional implementation change.

One such situation can arise if we intentionally change the address the Link component in our example is pointing to.

```javascript
// Updated test case with a Link to a different address
it('renders correctly', () => {
  const tree = renderer
    .create(<Link page="http://www.instagram.com">Instagram</Link>)
    .toJSON();
  expect(tree).toMatchSnapshot();
});
```

In that case, Jest will print this output:

![](/img/content/failedSnapshotTest.png)

Since we just updated our component to point to a different address, it's reasonable to expect changes in the snapshot for this component. Our snapshot test case is failing because the snapshot for our updated component no longer matches the snapshot artifact for this test case.

To resolve this, we will need to update our snapshot artifacts. You can run Jest with a flag that will tell it to re-generate snapshots:

```bash
jest --updateSnapshot
```

Go ahead and accept the changes by running the above command. You may also use the equivalent single-character `-u` flag to re-generate snapshots if you prefer. This will re-generate snapshot artifacts for all failing snapshot tests. If we had any additional failing snapshot tests due to an unintentional bug, we would need to fix the bug before re-generating snapshots to avoid recording snapshots of the buggy behavior.

If you'd like to limit which snapshot test cases get re-generated, you can pass an additional `--testNamePattern` flag to re-record snapshots only for those tests that match the pattern.

You can try out this functionality by cloning the [snapshot example](https://github.com/facebook/jest/tree/master/examples/snapshot), modifying the `Link` component, and running Jest.

### Interactive Snapshot Mode

Failed snapshots can also be updated interactively in watch mode:

![](/img/content/interactiveSnapshot.png)

Once you enter Interactive Snapshot Mode, Jest will step you through the failed snapshots one test at a time and give you the opportunity to review the failed output.

From here you can choose to update that snapshot or skip to the next:

![](/img/content/interactiveSnapshotUpdate.gif)

Once you're finished, Jest will give you a summary before returning back to watch mode:

![](/img/content/interactiveSnapshotDone.png)

### Inline Snapshots

Inline snapshots behave identically to external snapshots (`.snap` files), except the snapshot values are written automatically back into the source code. This means you can get the benefits of automatically generated snapshots without having to switch to an external file to make sure the correct value was written.

> Inline snapshots are powered by [Prettier](https://prettier.io). To use inline snapshots you must have `prettier` installed in your project. Your Prettier configuration will be respected when writing to test files.
>
> If you have `prettier` installed in a location where Jest can't find it, you can tell Jest how to find it using the [`"prettierPath"`](./Configuration.md#prettierpath-string) configuration property.

**Example:**

First, you write a test, calling `.toMatchInlineSnapshot()` with no arguments:

```javascript
it('renders correctly', () => {
  const tree = renderer
    .create(<Link page="https://prettier.io">Prettier</Link>)
    .toJSON();
  expect(tree).toMatchInlineSnapshot();
});
```

The next time you run Jest, `tree` will be evaluated, and a snapshot will be written as an argument to `toMatchInlineSnapshot`:

```javascript
it('renders correctly', () => {
  const tree = renderer
    .create(<Link page="https://prettier.io">Prettier</Link>)
    .toJSON();
  expect(tree).toMatchInlineSnapshot(`
<a
  className="normal"
  href="https://prettier.io"
  onMouseEnter={[Function]}
  onMouseLeave={[Function]}
>
  Prettier
</a>
`);
});
```

That's all there is to it! You can even update the snapshots with `--updateSnapshot` or using the `u` key in `--watch` mode.

### Property Matchers

Often there are fields in the object you want to snapshot which are generated (like IDs and Dates). If you try to snapshot these objects, they will force the snapshot to fail on every run:

```javascript
it('will fail every time', () => {
  const user = {
    createdAt: new Date(),
    id: Math.floor(Math.random() * 20),
    name: 'LeBron James',
  };

  expect(user).toMatchSnapshot();
});

// Snapshot
exports[`will fail every time 1`] = `
Object {
  "createdAt": 2018-05-19T23:36:09.816Z,
  "id": 3,
  "name": "LeBron James",
}
`;
```

For these cases, Jest allows providing an asymmetric matcher for any property. These matchers are checked before the snapshot is written or tested, and then saved to the snapshot file instead of the received value:

```javascript
it('will check the matchers and pass', () => {
  const user = {
    createdAt: new Date(),
    id: Math.floor(Math.random() * 20),
    name: 'LeBron James',
  };

  expect(user).toMatchSnapshot({
    createdAt: expect.any(Date),
    id: expect.any(Number),
  });
});

// Snapshot
exports[`will check the matchers and pass 1`] = `
Object {
  "createdAt": Any<Date>,
  "id": Any<Number>,
  "name": "LeBron James",
}
`;
```

Any given value that is not a matcher will be checked exactly and saved to the snapshot:

```javascript
it('will check the values and pass', () => {
  const user = {
    createdAt: new Date(),
    name: 'Bond... James Bond',
  };

  expect(user).toMatchSnapshot({
    createdAt: expect.any(Date),
    name: 'Bond... James Bond',
  });
});

// Snapshot
exports[`will check the values and pass 1`] = `
Object {
  "createdAt": Any<Date>,
  "name": 'Bond... James Bond',
}
`;
```

## Best Practices

Snapshots are a fantastic tool for identifying unexpected interface changes within your application – whether that interface is an API response, UI, logs, or error messages. As with any testing strategy, there are some best-practices you should be aware of, and guidelines you should follow, in order to use them effectively.

### 1. Treat snapshots as code

Commit snapshots and review them as part of your regular code review process. This means treating snapshots as you would any other type of test or code in your project.

Ensure that your snapshots are readable by keeping them focused, short, and by using tools that enforce these stylistic conventions.

As mentioned previously, Jest uses [`pretty-format`](https://yarnpkg.com/en/package/pretty-format) to make snapshots human-readable, but you may find it useful to introduce additional tools, like [`eslint-plugin-jest`](https://yarnpkg.com/en/package/eslint-plugin-jest) with its [`no-large-snapshots`](https://github.com/jest-community/eslint-plugin-jest/blob/master/docs/rules/no-large-snapshots.md) option, or [`snapshot-diff`](https://yarnpkg.com/en/package/snapshot-diff) with its component snapshot comparison feature, to promote committing short, focused assertions.

The goal is to make it easy to review snapshots in pull requests, and fight against the habit of simply regenerating snapshots when test suites fail instead of examining the root causes of their failure.

### 2. Tests should be deterministic

Your tests should be deterministic. Running the same tests multiple times on a component that has not changed should produce the same results every time. You're responsible for making sure your generated snapshots do not include platform specific or other non-deterministic data.

For example, if you have a [Clock](https://github.com/facebook/jest/blob/master/examples/snapshot/Clock.react.js) component that uses `Date.now()`, the snapshot generated from this component will be different every time the test case is run. In this case we can [mock the Date.now() method](MockFunctions.md) to return a consistent value every time the test is run:

```js
Date.now = jest.fn(() => 1482363367071);
```

Now, every time the snapshot test case runs, `Date.now()` will return `1482363367071` consistently. This will result in the same snapshot being generated for this component regardless of when the test is run.

### 3. Use descriptive snapshot names

Always strive to use descriptive test and/or snapshot names for snapshots. The best names describe the expected snapshot content. This makes it easier for reviewers to verify the snapshots during review, and for anyone to know whether or not an outdated snapshot is the correct behavior before updating.

For example, compare:

```js
exports[`<UserName /> should handle some test case`] = `null`;

exports[`<UserName /> should handle some other test case`] = `
<div>
  Alan Turing
</div>
`;
```

To:

```js
exports[`<UserName /> should render null`] = `null`;

exports[`<UserName /> should render Alan Turing`] = `
<div>
  Alan Turing
</div>
`;
```

Since the later describes exactly what's expected in the output, it's easy to see when it's wrong:

```js
exports[`<UserName /> should render null`] = `
<div>
  Alan Turing
</div>
`;

exports[`<UserName /> should render Alan Turing`] = `null`;
```

## Frequently Asked Questions

### Are snapshots written automatically on Continuous Integration (CI) systems?

No, as of Jest 20, snapshots in Jest are not automatically written when Jest is run in a CI system without explicitly passing `--updateSnapshot`. It is expected that all snapshots are part of the code that is run on CI and since new snapshots automatically pass, they should not pass a test run on a CI system. It is recommended to always commit all snapshots and to keep them in version control.

### Should snapshot files be committed?

Yes, all snapshot files should be committed alongside the modules they are covering and their tests. They should be considered part of a test, similar to the value of any other assertion in Jest. In fact, snapshots represent the state of the source modules at any given point in time. In this way, when the source modules are modified, Jest can tell what changed from the previous version. It can also provide a lot of additional context during code review in which reviewers can study your changes better.

### Does snapshot testing only work with React components?

[React](TutorialReact.md) and [React Native](TutorialReactNative.md) components are a good use case for snapshot testing. However, snapshots can capture any serializable value and should be used anytime the goal is testing whether the output is correct. The Jest repository contains many examples of testing the output of Jest itself, the output of Jest's assertion library as well as log messages from various parts of the Jest codebase. See an example of [snapshotting CLI output](https://github.com/facebook/jest/blob/master/e2e/__tests__/console.test.js) in the Jest repo.

### What's the difference between snapshot testing and visual regression testing?

Snapshot testing and visual regression testing are two distinct ways of testing UIs, and they serve different purposes. Visual regression testing tools take screenshots of web pages and compare the resulting images pixel by pixel. With Snapshot testing values are serialized, stored within text files, and compared using a diff algorithm. There are different trade-offs to consider and we listed the reasons why snapshot testing was built in the [Jest blog](https://jestjs.io/blog/2016/07/27/jest-14.html#why-snapshot-testing).

### Does snapshot testing replace unit testing?

Snapshot testing is only one of more than 20 assertions that ship with Jest. The aim of snapshot testing is not to replace existing unit tests, but to provide additional value and make testing painless. In some scenarios, snapshot testing can potentially remove the need for unit testing for a particular set of functionalities (e.g. React components), but they can work together as well.

### What is the performance of snapshot testing regarding speed and size of the generated files?

Jest has been rewritten with performance in mind, and snapshot testing is not an exception. Since snapshots are stored within text files, this way of testing is fast and reliable. Jest generates a new file for each test file that invokes the `toMatchSnapshot` matcher. The size of the snapshots is pretty small: For reference, the size of all snapshot files in the Jest codebase itself is less than 300 KB.

### How do I resolve conflicts within snapshot files?

Snapshot files must always represent the current state of the modules they are covering. Therefore, if you are merging two branches and encounter a conflict in the snapshot files, you can either resolve the conflict manually or to update the snapshot file by running Jest and inspecting the result.

### Is it possible to apply test-driven development principles with snapshot testing?

Although it is possible to write snapshot files manually, that is usually not approachable. Snapshots help figuring out whether the output of the modules covered by tests is changed, rather than giving guidance to design the code in the first place.

### Does code coverage work with snapshot testing?

Yes, just like with any other test.
