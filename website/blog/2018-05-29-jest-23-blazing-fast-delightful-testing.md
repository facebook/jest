---
title: Jest 23: 🔥 Blazing Fast Delightful Testing
author: Rick Hanlon II
authorURL: https://twitter.com/rickhanlonii
authorFBID: 160800566
---

Today we are excited to announce Jest 23, our largest major release to date! Together with over 100 contributors, we've shipped a ton of features and bug fixes. Thank you to everyone in the community for helping make JavaScript Testing Delightful.

We would also like to welcome both [Babel](https://babeljs.io/) and [Webpack](https://webpack.js.org/) to the Jest community! After converting from Mocha to Jest 23 Beta, Webpack saw their total test suite time reduced 6x from over 13 minutes to 2 minutes 20 seconds. [#blazingmeansgood](https://twitter.com/search?q=%23blazingmeansgood)

Here's are some of the Jest 23 highlights and breaking changes.

<!--truncate-->

For a full list see the [changelog](https://github.com/facebook/jest/blob/master/CHANGELOG.md).

## Interactive Snapshot Mode

We've added a new default watch menu option we're calling Interactive Snapshot Mode. This new mode allows you to step through each failing snapshot in each failing suite to review your failed snapshots and choose to update or skip each individually.

![Interactive snapshot mode in action](/img/blog/23-interactive.gif)

See the Interactive Snapshot Mode docs [here](https://jestjs.io/docs/en/snapshot-testing.html#interactive-snapshot-mode).

## Snapshot Property Matchers

Often, objects you're snapshotting contain generated values like Dates and IDs. Jest now allows you to pass properties to the snapshot matcher which specify the structure of the data instead of the specific values. These property matchers are then verified before serializing the matcher type (instead of the value), giving you consistent snapshot results across test runs.

![Snapshot Property Matchers](/img/blog/23-snapshot-matchers.png)

See the updated `toMatchSnapshot` [docs](https://jestjs.io/docs/en/expect.html#tomatchsnapshotpropertymatchers-snapshotname) or the Property Matcher [guide](https://jestjs.io/docs/en/snapshot-testing.html#property-matchers) for more information.

## Custom Asynchronous matchers

We now support asynchronous matchers with `expect.extends`! Async matchers return a Promise so that you can `await` for the matcher to resolve. As an example:

![Custom asynchronous matchers in action](/img/blog/23-async-matchers.png)

Docs available [here](https://jestjs.io/docs/en/expect.html#expectextendmatchers).

## Custom Asymmetric Matchers

Asymmetric matchers are a great tool to use when you only care about asymmetric equality. For example, when the left side is expected to be an object with some subset of properties on the right, instead of an exact match. Jest provides a number of asymmetric matchers out of the box, and in this release we're introducing Custom Asymmetric Matchers.

![Custom asymmetric matchers in action](/img/blog/23-asymmetric-matchers.png)

## Jest Each

[@mattphillipsio](https://twitter.com/mattphillipsio) has donated the `jest-each` package to Jest Core (thanks Matt!). `jest-each` is a library inspired by [`mocha-each`](https://yarnpkg.com/en/package/mocha-each) and [Spock Data Tables](http://spockframework.org/spock/docs/1.1/data_driven_testing.html#data-tables) which allows you to define a table of test cases, and then run a test for each row with the specified column values. We support both array types and template literals for all flavors of `describe` and `test`. Docs are available [here](https://jestjs.io/docs/en/api.html#testeachtable-name-fn), and for those not on Jest 23 yet, we're still publishing [`jest-each`](https://yarnpkg.com/en/package/jest-each) separately!

![jest-each in action](/img/blog/23-jest-each.png)

Huge shout out to Prettier for [fixing](https://github.com/prettier/prettier/pull/4423) the table formatting so quickly ([see Prettier 1.13](https://prettier.io/blog/2018/05/23/1.13.0.html#format-new-describeeach-table-in-jest-23-4423-by-ikatyang))!

## New Matchers

We only add matchers to core if we believe they will be useful to a large amount of people in the Jest community, and leave the majority of matchers to the community (see [jest-extended](https://yarnpkg.com/en/package/jest-extended)). Some matchers make the cut into core, and Jest 23 adds:

- nthCalledWith
- toReturn
- toReturnTimes
- toReturnWith
- lastReturnedWith
- nthReturnedWith
- toStrictEqual

![New matchers in action](/img/blog/23-new-matchers.png)

See the updated expect docs [here](https://jestjs.io/docs/en/expect.html).

## Debug Hanging Tests

A common issue we see on the issue tracker relates to “Jest” hanging after a test run. This is usually due to app code leaving handles open, preventing Jest from exiting. In the past, users have resorted to `--forceExit` to fix (not recommended).

To help debug these issues, we're now detecting when Jest does not exit:

![Detecting hanging tests](/img/blog/23-hanging-before.png)

And we offer a new flag `--detectOpenHandles` to help find the open handles:

![Running detectOpenHandles](/img/blog/23-hanging-after.png)

See the updated CLI docs [here](https://jestjs.io/docs/en/cli.html#detectopenhandles).

## Watch Mode Plugins

We have completely rewritten the watch mode system to allow adding custom plugins to watch mode. Watch Mode Plugins now make it possible to hook into Jest events and provide custom menu options in the Watch Mode Menu. All of the default Watch Mode prompts are implemented as plugins in this system, and the docs to create your own are available [here](https://jestjs.io/docs/en/watch-plugins.html).

With this change, we're also now able to bring back typeahead support as a Watch Mode Plugin via [jest-watch-typeahead](https://yarnpkg.com/en/package/jest-watch-typeahead)!

![Typeahead plugin in action](/img/blog/23-typeahead.gif)

See [jest-watch-typeahead](https://github.com/jest-community/jest-watch-typeahead) for documentation and install instructions. Huge thank you to [@rogeliog](https://twitter.com/rogeliog) for the new watch mode plugin system and the jest-watch-typeahead plugin!

## Breaking Changes

As with every major release, we are making a few breaking changes to make larger changes in the future possible and to push the testing experience to a new level. Here's a list of the biggest changes you may see:

- **Require test descriptions and functions**: We're now failing tests that do not include both a function and a description.
- **Remove undefined props from React snapshots**: Smaller snapshots and proper React behavior.
- **Remove deprecations**: We removed mapCoverage since it's no longer needed. Additionally, we removed `jest.genMockFunction` and `jest.genMockFn` since these are the same as `jest.fn`.
- **Add snapshot names to failures**: We added the snapshot name (if provided) to the snapshot failure message so it's easier to find the snapshot that's failing.
- **Replace mock timestamps**: We replaced mock timestamps with invocationCallOrder since two or mocks may often have the same timestamp, making it impossible to test the call order.
- **Add results to mock snapshots**: We added mock function call results to snapshots so that both the calls and the results of the invocation are tracked.

## Other Improvements

- **Watch mode coverage**: Coverage is now limited to only the files tested in watch mode or when using `--onlyChanged` and `--findRelatedTests`.
- **Version documentation**: We added docs for each minor release back to Jest 22, and have removed all of the “Requires Jest X.X+” from the docs.
- **Better snapshot summaries**: We overhauled the Snapshot Summary output to make obsolete snapshots more informative.
- **Better stack traces**: We added stack traces to asynchronous errors, timeout errors, expect.assertions, and thrown non-errors. We're also indicating the column in the code frame!
- **Better React 16 support**: Adds snapshot support for `React.Fragment`, `React.forwardRef`, and `React.createContext`.
- **Track mock return and throw values**: Adds `mock.results` that contains the return value or thrown value for each mock call.
- **Blazing 🔥**: We've added a blazing badge to the README to indicate that Jest is blazing good.

## Jest Summit

Last week, the Jest Core Team met for the Jest Summit at Facebook London where worked on and released Jest 23, announced the Jest Open Collective, and gave a number of talks:

- **Christoph Nakazawa** – [Intro](https://www.youtube.com/watch?v=cAKYQpTC7MA)
- **Aaron Abramov** – [Writing Meaningful Tests](https://youtu.be/cAKYQpTC7MA?t=440)
- **Rick Hanlon II** – [Blazing Fast Snapshot Testing in Jest 23](https://youtu.be/cAKYQpTC7MA?t=1881)
- **Simen Bekkhus** – [Jest's Delightful Error Messages](https://youtu.be/cAKYQpTC7MA?t=2990)
- **Matt Phillips** – [Level up your Jest experience with community packages](https://youtu.be/cAKYQpTC7MA?t=3852)
- **Michele Bertoli** – [Snapshot all the things](https://youtu.be/cAKYQpTC7MA?t=4582)
- **Jordan Eldredge** – [Webamp: Learn by imitating](https://youtu.be/cAKYQpTC7MA?t=5185)

Full talk is available [here](https://www.youtube.com/watch?v=cAKYQpTC7MA).

The turnout was amazing, and we were able to meet a lot of the London-based community in person. Thank you to everyone who joined us and for your continued support! Stay tuned for our next post which will outline the Jest Open Collective and the plans we have for the future.

_As always, this release couldn't have been possible without you, the JavaScript community. We are incredibly grateful that we get the opportunity to work on improving JavaScript testing together. If you'd like to contribute to Jest, please don't hesitate to reach out to us on_ _[GitHub](https://github.com/facebook/jest) or on_ _[Discord](https://discord.gg/MWRhKCj)._
