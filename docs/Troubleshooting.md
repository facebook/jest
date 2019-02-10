---
id: troubleshooting
title: Troubleshooting
---

Uh oh, something went wrong? Use this guide to resolve issues with Jest.

## Tests are Failing and You Don't Know Why

Try using the debugging support built into Node. Note: This will only work in Node.js 8+.

Place a `debugger;` statement in any of your tests, and then, in your project's directory, run:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand [any other arguments here]
or on Windows
node --inspect-brk ./node_modules/jest/bin/jest.js --runInBand [any other arguments here]
```

This will run Jest in a Node process that an external debugger can connect to. Note that the process will pause until the debugger has connected to it.

To debug in Google Chrome (or any Chromium-based browser), simply open your browser and go to `chrome://inspect` and click on "Open Dedicated DevTools for Node", which will give you a list of available node instances you can connect to. Simply click on the address displayed in the terminal (usually something like `localhost:9229`) after running the above command, and you will be able to debug Jest using Chrome's DevTools.

The Chrome Developer Tools will be displayed, and a breakpoint will be set at the first line of the Jest CLI script (this is done simply to give you time to open the developer tools and to prevent Jest from executing before you have time to do so). Click the button that looks like a "play" button in the upper right hand side of the screen to continue execution. When Jest executes the test that contains the `debugger` statement, execution will pause and you can examine the current scope and call stack.

> Note: the `--runInBand` cli option makes sure Jest runs test in the same process rather than spawning processes for individual tests. Normally Jest parallelizes test runs across processes but it is hard to debug many processes at the same time.

## Debugging in VS Code

There are multiple ways to debug Jest tests with [Visual Studio Code's](https://code.visualstudio.com) built in [debugger](https://code.visualstudio.com/docs/nodejs/nodejs-debugging).

To attach the built-in debugger, run your tests as aforementioned:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand [any other arguments here]
or on Windows
node --inspect-brk ./node_modules/jest/bin/jest.js --runInBand [any other arguments here]
```

Then attach VS Code's debugger using the following `launch.json` config:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach",
      "port": 9229
    }
  ]
}
```

To automatically launch and attach to a process running your tests, use the following configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "runtimeArgs": [
        "--inspect-brk",
        "${workspaceRoot}/node_modules/.bin/jest",
        "--runInBand"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "port": 9229
    }
  ]
}
```

or the following for Windows:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "runtimeArgs": [
        "--inspect-brk",
        "${workspaceRoot}/node_modules/jest/bin/jest.js",
        "--runInBand"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "port": 9229
    }
  ]
}
```

If you are using Facebook's [`create-react-app`](https://github.com/facebookincubator/create-react-app), you can debug your Jest tests with the following configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CRA Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/react-scripts",
      "args": ["test", "--runInBand", "--no-cache", "--env=jsdom"],
      "cwd": "${workspaceRoot}",
      "protocol": "inspector",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

More information on Node debugging can be found [here](https://nodejs.org/api/debugger.html).

## Debugging in WebStorm

The easiest way to debug Jest tests in [WebStorm](https://www.jetbrains.com/webstorm/) is using `Jest run/debug configuration`. It will launch tests and automatically attach debugger.

In the WebStorm menu `Run` select `Edit Configurations...`. Then click `+` and select `Jest`. Optionally specify the Jest configuration file, additional options, and environment variables. Save the configuration, put the breakpoints in the code, then click the green debug icon to start debugging.

If you are using Facebook's [`create-react-app`](https://github.com/facebookincubator/create-react-app), in the Jest run/debug configuration specify the path to the `react-scripts` package in the Jest package field and add `--env=jsdom` to the Jest options field.

## Caching Issues

The transform script was changed or Babel was updated and the changes aren't being recognized by Jest?

Retry with [`--no-cache`](CLI.md#cache). Jest caches transformed module files to speed up test execution. If you are using your own custom transformer, consider adding a `getCacheKey` function to it: [getCacheKey in Relay](https://github.com/facebook/relay/blob/58cf36c73769690f0bbf90562707eadb062b029d/scripts/jest/preprocessor.js#L56-L61).

## Unresolved Promises

If a promise doesn't resolve at all, this error might be thrown:

```bash
- Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.`
```

Most commonly this is being caused by conflicting Promise implementations. Consider replacing the global promise implementation with your own, for example `global.Promise = jest.requireActual('promise');` and/or consolidate the used Promise libraries to a single one.

If your test is long running, you may want to consider to increase the timeout by calling `jest.setTimeout`

```js
jest.setTimeout(10000); // 10 second timeout
```

## Watchman Issues

Try running Jest with [`--no-watchman`](CLI.md#watchman) or set the `watchman` configuration option to `false`.

Also see [watchman troubleshooting](https://facebook.github.io/watchman/docs/troubleshooting.html).

## Tests are Extremely Slow on Docker and/or Continuous Integration (CI) server.

While Jest is most of the time extremely fast on modern multi-core computers with fast SSDs, it may be slow on certain setups as our users [have](https://github.com/facebook/jest/issues/1395) [discovered](https://github.com/facebook/jest/issues/1524#issuecomment-260246008).

Based on the [findings](https://github.com/facebook/jest/issues/1524#issuecomment-262366820), one way to mitigate this issue and improve the speed by up to 50% is to run tests sequentially.

In order to do this you can run tests in the same thread using [`--runInBand`](CLI.md#runinband):

```bash
# Using Jest CLI
jest --runInBand

# Using yarn test (e.g. with create-react-app)
yarn test --runInBand
```

Another alternative to expediting test execution time on Continuous Integration Servers such as Travis-CI is to set the max worker pool to ~_4_. Specifically on Travis-CI, this can reduce test execution time in half. Note: The Travis CI _free_ plan available for open source projects only includes 2 CPU cores.

```bash
# Using Jest CLI
jest --maxWorkers=4

# Using yarn test (e.g. with create-react-app)
yarn test --maxWorkers=4
```

## Compatibility issues

Jest takes advantage of new features added to Node 6. We recommend that you upgrade to the latest stable release of Node. The minimum supported version is `v6.0.0`. Versions `0.x.x` and `4.x.x` are not supported because the `jsdom` version used in Jest doesn't support Node 4. However, if you need to run Jest on Node 4, you can use the `testEnvironment` config to use a [custom environment](https://jestjs.io/docs/en/configuration.html#testenvironment-string) that supports Node 4, such as [`jest-environment-node`](https://yarnpkg.com/en/package/jest-environment-node).

## `coveragePathIgnorePatterns` seems to not have any effect.

Make sure you are not using the `babel-plugin-istanbul` plugin. Jest wraps Istanbul, and therefore also tells Istanbul what files to instrument with coverage collection. When using `babel-plugin-istanbul`, every file that is processed by Babel will have coverage collection code, hence it is not being ignored by `coveragePathIgnorePatterns`.

## Defining Tests

Tests must be defined synchronously for Jest to be able to collect your tests.

As an example to show why this is the case, imagine we wrote a test like so:

```js
// Don't do this it will not work
setTimeout(() => {
  it('passes', () => expect(1).toBe(1));
}, 0);
```

When Jest runs your test to collect the `test`s it will not find any because we have set the definition to happen asynchronously on the next tick of the event loop.

_Note:_ This means when you are using `test.each` you cannot set the table asynchronously within a `beforeEach` / `beforeAll`.

## Still unresolved?

See [Help](/help.html).
