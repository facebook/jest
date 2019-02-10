---
title: Jest 24: 💅 Refreshing, Polished, TypeScript-friendly
author: Simen Bekkhus
authorURL: https://github.com/SimenB
authorFBID: 100003004880942
---

Today we are happy to announce the next major release of Jest - version 24! It's been 4 months since the last minor release, and 8 months since Jest 23, so this upgrade is a big one, with something for everyone! Highlights include built-in support for TypeScript by upgrading the Jest internals to Babel 7, fixing some long-standing issues with missing console output and performance issues when computing large diffs, and a brand new sparkling website. ✨

For a full list of all changes see the [changelog](https://github.com/facebook/jest/blob/master/CHANGELOG.md).

<!--truncate-->

## New Website

[@orta](https://twitter.com/orta) has provided a beautiful redesign of Jest's website, which has been implemented by community members [@montogeek](https://twitter.com/montogeek) and [@brainkim](https://github.com/brainkim).

The aim of the redesign was to highlight more of what makes Jest awesome, and to decouple the idea that Jest is primarily a tool for testing React apps - you can use Jest with all sorts of projects and we want to make that obvious. You can read more about the ideas behind the redesign in [this issue](https://github.com/facebook/jest/issues/7265).

## TypeScript support

We've upgraded to Babel 7 internally for Jest 24, which comes with support for TypeScript projects. That means Jest can support transpiling TypeScript out of the box, as long as you configure Babel to use it with `@babel/preset-typescript`. One caveat to the default TypeScript support, similar to Flow, is that Babel will only strip out the type annotations to make your code valid JavaScript. It will _not_ typecheck your code.

While Jest has supported Babel 7 since version 22 released in December 2017, it required usage of a bridge module in order to fit in with Jest's support of Babel 6. In Jest 24 we have migrated entirely over to Babel 7, with great help from community member [@milesj](https://github.com/milesj). This means that setup is now easier and we can take advantage of other Babel 7 features, such as config loading and automatic `modules` transpilation. Make sure to remove the `babel-core@^7.0.0-bridge.0` as it's not needed now.

If you want to run typechecks while you test, you should use [`ts-jest`](https://github.com/kulshekhar/ts-jest). You will need to configure the transformer, as Jest by default applies Babel to `.ts` (and `.tsx`) files. Alternatively, you can run `tsc` or even use a Jest runner to simultaneously transpile your TypeScript whilst running your tests! See [`jest-runner-tsc`](https://github.com/azz/jest-runner-tsc) for more information.

_Note that if you for whatever reason cannot upgrade to Babel 7, you can still use Jest 24 with `babel@6` as long as you keep `babel-jest` at version 23._

## `test.todo`

Jest 23 had a change that made tests missing an implementation throw instead of being skipped. This change was made due to feedback that accidentally skipped tests were hard to discover and hard to track down. However, this change broke the workflow for quite a few developers who used the feature to sketch out which tests to write.

In Jest 24, we are addressing this issue by adding an explicit `test.todo` (inspired by the excellent AVA), which will be printed separately in the test summary. It allows you to quickly sketch out which tests you want to write and in the future, an [ESLint](https://eslint.org/) rule might even be able to warn you that you have forgotten to write out some tests.

```js
test.todo('invalid input should throw');

test.todo('missing options should be normalized');
```

![test.todo](/img/blog/24-todo.png)

## Improved Assertion Messages

When tests fail, you need to make confident and correct decisions which changes are expected progress and which changes are unexpected regressions. It is especially important not to miss a few regressions hidden among much progress. Jest 24 makes reports when assertions fail more clear and concise for several matchers. Because the effort will continue in Jest 25, you might notice some temporary inconsistencies. If your tests never fail, then you won't get to see them - for the rest of us, it'll be easier to debug why something isn't working as expected. Thanks for the hard work by [@ittordepam](https://twitter.com/ittordepam) and other contributors from the community.

You can see these changes across all these PRs: [7621](https://github.com/facebook/jest/pull/7621), [7557](https://github.com/facebook/jest/pull/7557), [7448](https://github.com/facebook/jest/pull/7448), [7325](https://github.com/facebook/jest/pull/7325), [7241](https://github.com/facebook/jest/pull/7241), [7152](https://github.com/facebook/jest/pull/7152), [7125](https://github.com/facebook/jest/pull/7125), [7107](https://github.com/facebook/jest/pull/7107), [6961](https://github.com/facebook/jest/pull/6961).

Examples:

Failing assertion

![failing assertion](/img/blog/24-assertion-error.png)

Type mismatch

![different types](/img/blog/24-different-types.png)

Mock function not called

![mock functions](/img/blog/24-mock-function.png)

## Fixing old pain

We've fixed a couple of really old issues in this release.

The first one we'd like to highlight is `console.log` statements going missing. Jest intercepts and collects all logs in order to give you a stack trace to them, as well as provide them to reporters so you can handle them however you want. However, this has led to an issue where they have simply been missing in certain edge cases. Luckily for Jest 24, [@spion](https://twitter.com/spion) has [stepped up](https://github.com/facebook/jest/pull/6871) and fixed this issue. Thank you very much!

The second one is an issue where Jest runs out of memory if the difference in serialization of expected and received value has a huge number of insertion changes (either unexpected because of mistake in test or defect in serializer or expected because of temporary failures during test-driven development). [@ittordepam](https://twitter.com/ittordepam) has [replaced](https://github.com/facebook/jest/pull/6961) the previous diffing algorithm with `diff-sequences` package, which should fix this issue because it uses the theoretical minimum amount of memory. It opens up possibility for word-diffs in the future, similar to what [git provides](https://git-scm.com/docs/git-diff#git-diff---word-diffltmodegt). Please see [this PR](https://github.com/facebook/jest/pull/4619) and don't hesitate to reach out if you want to help make that happen!

## Other highlights

- We have some improvements for `globalSetup` and `globalTeardown` as well - code transformation will be applied to them similar to `setupFiles` and they are now supported as part of `projects`.
- You can [configure](https://github.com/facebook/jest/pull/6143) Jest's snapshot location, this is mainly useful if you are building tools which use Jest in a larger build process.
- A quirk of Jest's CLI has been that while some flags and options have been camel cased (such as `runInBand`), others have not been (such as `no-cache`). In Jest 24, both are recognized, meaning you can write your CLI arguments however you want.
- We've renamed `setupTestFrameworkScriptFile` to `setupFilesAfterEnv`, and made it into an array. We hope this will make it more obvious what the options is for. We have plans to further overhaul the configuration in the next major, see the paragraph in the section below.
- To reduce the amount of magic Jest performs to “just work™”, in this release we decided to drop automatic injection of `regenerator-runtime`, which is sometimes used in compiled async code. Including `regenerator-runtime` is not always necessary and we believe it's the user's responsibility to include it if it's needed. If you use `@babel/preset-env` with `targets` set to a modern Node version (e.g. Node 6+) you will not need to include it. Please see our [Using Babel docs](/docs/en/getting-started#using-babel) for more information.
- Node.js 10 came with an experimental module [called `worker_threads`](https://nodejs.org/api/worker_threads.html), which is similar to Worker threads in the browser. `jest-worker`, part of the [Jest platform](/docs/en/jest-platform), will be able to use `worker_threads` if available instead of `child_process`, which makes it even faster! [Benchmarks](https://github.com/facebook/jest/pull/6676) show a 50% improvement. Due to its experimental nature, it's not enabled when using Jest as a test runner, but you can use it in your own projects today! We plan to enable it by default when it's promoted from experimantal status in Node.js.

## Breaking Changes

While all breaking changes are listed in the [changelog](https://github.com/facebook/jest/blob/master/CHANGELOG.md), there's a few of them that are worth highlighting:

- We've upgraded to Micromatch 3. While this might not affect every user, it is stricter in its parsing of globs than version 2, which is used in Jest 23. Please read through [this](https://github.com/micromatch/micromatch/issues/133#issuecomment-404211484) and linked issues for examples of invalid globs in case you have problems.
- We've removed code remnants that was needed for Node 4. It was previously technically possible to run Jest 23 on Node 4 - that is no longer possible without polyfilling and transpiling.
- Some changes to serialization of mock functions in snapshots - make sure to double check your updated snapshots after upgrading. Related [PR](https://github.com/facebook/jest/pull/6381).
- Jest no longer automatically injects `regenerator-runtime` - if you get errors concering it, make sure to configure Babel to properly transpile `async` functions, using e.g. `@babel/preset-env`. Related [PR](https://github.com/facebook/jest/pull/7595).

## The future

We are incredibly humbled by the results in [State Of JS 2018](https://2018.stateofjs.com/awards/), where Jest won the “Highest Satisfaction” award. Another huge thing to happen in 2018 was in October, when Jest passed 2 million weekly downloads for the first time. Thank you.

We are very thankful for the trust in us shown by the community, and hope to build on it in the future. We will ensure Jest 24 and future releases will continue to build upon this incredible foundation, and continue to be an integral part of JavaScript developers' toolkits.

This has been the first release where we have explored the idea of using our Open Collective funding to create bug bounties. This worked well in getting non-core developers involved in the implementation of the new landing page, and we're optimistic for a long running bug where Jest globals [are mismatched](https://github.com/facebook/jest/issues/2549) from Node globals. We'd like to do more, if you have a pet bug that's a good candidate for our bounty program, please let us know. In the meantime, you can find all the tickets with a bounty via [the issue label](https://github.com/facebook/jest/labels/Has%20Bounty).

We have already started to make plans for the next release of Jest 25, with the biggest planned feature being an overhaul of our configuration, which is pretty hard to grok, mainly because of overlapping option and mixing globs and regular expressions. Feedback on how you want Jest's configuration to look is very much welcome, and can be submitted in [this issue](https://github.com/facebook/jest/issues/7185).

You might also have heard that we are planning to migrate the code base from Flow to TypeScript. We are hopeful that this migration will enable even more contributors to jump in and help make 2019 even better for JavaScript testing. 🚀 The plan is to land this in a minor release in the not too distant future. Feedback on this choice can be added to [the RFC](https://github.com/facebook/jest/pull/7554).

Lastly, if you've ever wondered about how Jest is built, [@cpojer](https://twitter.com/cpojer) has recorded a video with an architectural overview of how Jest is put together under the hood. Feel free to reach out if you have any further questions about it. The video is available on our [website](https://jestjs.io/docs/en/next/architecture).

Happy Jesting! 🃏
