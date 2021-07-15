---
id: playwright
title: Using with Playwright
---

With the [Global Setup/Teardown](Configuration.md#globalsetup-string) and [Async Test Environment](Configuration.md#testenvironment-string) APIs, Jest can work smoothly with [Playwright](https://github.com/microsoft/playwright).

## Use jest-playwright Preset

[jest-playwright-preset](https://github.com/playwright-community/jest-playwright) provides all required configuration to run your tests using Playwright.

1.  First, install `jest-playwright-preset` and `playwright`

```
yarn add --dev jest-playwright-preset playwright
```

2.  Specify preset in your [Jest configuration](Configuration.md):

```js
module.exports = {
  'preset': 'jest-playwright-preset',
  // It's useful to have it > 30 seconds because Playwright will wait by default up to 30 seconds
  // e.g. for a click and otherwise there is no good error reporting guaranteed.
  'testTimeout': 60000,
}
```

3.  Write your test

```js
describe('Google', () => {
  beforeAll(async () => {
    await page.goto('https://www.google.com');
  });

  it('should be titled "Google"', async () => {
    expect(await page.title()).toBe('Google');
  });
});
```

There's no need to launch the browser manually. Playwright's `page`, `context`, and `browser` classes will automatically be exposed as global variables see [here](https://github.com/playwright-community/jest-playwright#globals).

You can also create a new context and page for each test to have them isolated from each other, see [here](https://github.com/playwright-community/jest-playwright#reset-current-context).

## Custom example without jest-playwright-preset

You can also hook up Playwright with Jest from scratch. The basic idea is to:

1.  launch a Playwright BrowserServer and save the websocket endpoint to disk with Global Setup
2.  connect to Playwright from each Test Environment
3.  close the BrowserServer with Global Teardown

We have a small constants file where we store our shared used variables:

```js
// constants.js
const os = require('os');
const path = require('path');

const BROWSER_NAME = process.env.BROWSER || 'chromium';
const ENVIRONMENT_DATA_TRANSFER_DIR = path.join(os.tmpdir(), 'jest_playwright_global_setup');
const ENVIRONMENT_DATA_TRANSFER_WS_ENDPOINT = path.join(ENVIRONMENT_DATA_TRANSFER_DIR, 'ws_endpoint');

module.exports = {
  BROWSER_NAME,
  ENVIRONMENT_DATA_TRANSFER_DIR,
  ENVIRONMENT_DATA_TRANSFER_WS_ENDPOINT,
}
```

Here's an example of the GlobalSetup script

```js
// setup.js
const fs = require('fs');
const mkdirp = require('mkdirp');
const playwright = require('playwright');
const { ENVIRONMENT_DATA_TRANSFER_WS_ENDPOINT, BROWSER_NAME, ENVIRONMENT_DATA_TRANSFER_DIR } = require('./constants.js');

module.exports = async function () {
  const browser = await playwright[BROWSER_NAME].launchServer();
  // This global is not available inside tests but only in global teardown
  global.__BROWSER_GLOBAL__ = browser;
  // Instead, we expose the connection details via file system to be used in tests
  await mkdirp(ENVIRONMENT_DATA_TRANSFER_DIR);
  await fs.promises.writeFile(ENVIRONMENT_DATA_TRANSFER_WS_ENDPOINT, browser.wsEndpoint());
}
```

Then we need a custom Test Environment for Playwright

```js
// playwright_environment.js
const fs = require('fs');
const playwright = require('playwright');
const NodeEnvironment = require('jest-environment-node');
const { BROWSER_NAME, ENVIRONMENT_DATA_TRANSFER_WS_ENDPOINT } = require('./constants.js');

class PlaywrightEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    const wsEndpoint = await fs.promises.readFile(ENVIRONMENT_DATA_TRANSFER_WS_ENDPOINT, 'utf8');
    if (!wsEndpoint) {
      throw new Error('wsEndpoint not found');
    }
    this.global.__BROWSER_NAME__ = BROWSER_NAME;
    this.global.__BROWSER__ = await playwright[BROWSER_NAME].connect({
      wsEndpoint,
    });
  }

  async teardown() {
    await this.global.__BROWSER__.close();
    await super.teardown();
  }
  /**
  // For having a new context in each test, you can use the following method where Jest will internally
  // send the events to, and based on the events new context/page instances get created/closed.

  async handleTestEvent(event, state) {
    switch (event.name) {
      case 'test_start':
        this.global.context = await this.global.__BROWSER__.newContext();
        this.global.page = await this.global.context.newPage();
        break;
      case 'test_done':
        await this.global.context.close();
        break;
    }
  }
  */
}

module.exports = PlaywrightEnvironment
```

Finally, we can close the Playwright BrowserServer and clean-up the file

```js
// teardown.js
const rimraf = require('rimraf');
const { ENVIRONMENT_DATA_TRANSFER_DIR } = require('./constants');

module.exports = async function() {
  await global.__BROWSER_GLOBAL__.close();
  rimraf.sync(ENVIRONMENT_DATA_TRANSFER_DIR);
}
```

With all the things set up, we can now write our tests like this:

```js
// test.js

describe('/ (Home Page)', () => {
  /** @type {import('playwright').Page} */
  let page;
  /** @type {import('playwright').BrowserContext} */
  let context;
  beforeAll(async () => {
    context = await global.__BROWSER__.newContext();
    page = await context.newPage();
    await page.goto('https://www.google.com');
  });

  afterAll(async () => {
    await context.close();
  })

  it('should load without error', async () => {
    const text = await page.evaluate(() => document.body.textContent);
    expect(text).toContain('google');
  });
});
```

Finally, set `jest.config.js` to read from these files. (The `jest-playwright-preset` does something like this under the hood.)

```js
module.exports = {
  globalSetup: './setup.js',
  globalTeardown: './teardown.js',
  testEnvironment: './playwright_environment.js',
  // It's useful to have it > 30 seconds because Playwright will wait by default up to 30 seconds and otherwise there is no good error reporting guaranteed.
  testTimeout: 60000,
};
```

Here's the code of a [full working example](https://github.com/mxschmitt/jest-playwright-example) and [here](https://github.com/mxschmitt/jest-playwright-example-esm) with ES modules.
