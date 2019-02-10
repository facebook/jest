---
id: version-24.0-puppeteer
title: Using with puppeteer
original_id: puppeteer
---

With the [Global Setup/Teardown](Configuration.md#globalsetup-string) and [Async Test Environment](Configuration.md#testenvironment-string) APIs, Jest can work smoothly with [puppeteer](https://github.com/GoogleChrome/puppeteer).

## Use jest-puppeteer Preset

[Jest Puppeteer](https://github.com/smooth-code/jest-puppeteer) provides all required configuration to run your tests using Puppeteer.

1.  First install `jest-puppeteer`

```
yarn add --dev jest-puppeteer
```

2.  Specify preset in your Jest configuration:

```json
{
  "preset": "jest-puppeteer"
}
```

3.  Write your test

```js
describe('Google', () => {
  beforeAll(async () => {
    await page.goto('https://google.com');
  });

  it('should be titled "Google"', async () => {
    await expect(page.title()).resolves.toMatch('Google');
  });
});
```

There's no need to load any dependencies. Puppeteer's `page` and `browser` classes will automatically be exposed

See [documentation](https://github.com/smooth-code/jest-puppeteer).

## Custom example without jest-puppeteer preset

You can also hook up puppeteer from scratch. The basic idea is to:

1.  launch & file the websocket endpoint of puppeteer with Global Setup
2.  connect to puppeteer from each Test Environment
3.  close puppeteer with Global Teardown

Here's an example of the GlobalSetup script

```js
// setup.js
const puppeteer = require('puppeteer');
const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

module.exports = async function() {
  const browser = await puppeteer.launch();
  // store the browser instance so we can teardown it later
  // this global is only available in the teardown but not in TestEnvironments
  global.__BROWSER_GLOBAL__ = browser;

  // use the file system to expose the wsEndpoint for TestEnvironments
  mkdirp.sync(DIR);
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint());
};
```

Then we need a custom Test Environment for puppeteer

```js
// puppeteer_environment.js
const NodeEnvironment = require('jest-environment-node');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const os = require('os');

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

class PuppeteerEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    await super.setup();
    // get the wsEndpoint
    const wsEndpoint = fs.readFileSync(path.join(DIR, 'wsEndpoint'), 'utf8');
    if (!wsEndpoint) {
      throw new Error('wsEndpoint not found');
    }

    // connect to puppeteer
    this.global.__BROWSER__ = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
    });
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = PuppeteerEnvironment;
```

Finally we can close the puppeteer instance and clean-up the file

```js
// teardown.js
const os = require('os');
const rimraf = require('rimraf');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');
module.exports = async function() {
  // close the browser instance
  await global.__BROWSER_GLOBAL__.close();

  // clean-up the wsEndpoint file
  rimraf.sync(DIR);
};
```

With all the things set up, we can now write our tests like this:

```js
// test.js
const timeout = 5000;

describe(
  '/ (Home Page)',
  () => {
    let page;
    beforeAll(async () => {
      page = await global.__BROWSER__.newPage();
      await page.goto('https://google.com');
    }, timeout);

    it('should load without error', async () => {
      const text = await page.evaluate(() => document.body.textContent);
      expect(text).toContain('google');
    });
  },
  timeout,
);
```

Finally, set `jest.config.js` to read from these files. (The `jest-puppeteer` preset does something like this under the hood.)

```js
module.exports = {
  globalSetup: './setup.js',
  globalTeardown: './teardown.js',
  testEnvironment: './puppeteer_environment.js',
};
```

Here's the code of [full working example](https://github.com/xfumihiro/jest-puppeteer-example).
