---
id: version-22.x-puppeteer
title: Using with puppeteer
original_id: puppeteer
---

With the [Global Setup/Teardown](Configuration.md#globalsetup-string) and [Async Test Environment](Configuration.md#testenvironment-string) APIs, Jest can work smoothly with [puppeteer](https://github.com/GoogleChrome/puppeteer).

## A jest-puppeteer example

The basic idea is to:

1.  launch & file the websocket endpoint of puppeteer with Global Setup
2.  connect to puppeteer from each Test Environment
3.  close puppeteer with Global Teardown

Here's an example of the GlobalSetup script

```js
// setup.js
module.exports = async function() {
  const browser = await puppeteer.launch();
  // store the browser instance so we can teardown it later
  global.__BROWSER__ = browser;

  // file the wsEndpoint for TestEnvironments
  mkdirp.sync(DIR);
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint());
};
```

Then we need a custom Test Environment for puppeteer

```js
// puppeteer_environment.js
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
```

Finally we can close the puppeteer instance and clean-up the file

```js
// teardown.js
module.exports = async function() {
  // close the browser instance
  await global.__BROWSER__.close();

  // clean-up the wsEndpoint file
  rimraf.sync(DIR);
};
```

With all the things set up, we can now write our tests like this:

```js
// test.js
describe(
  '/ (Home Page)',
  () => {
    let page;
    beforeAll(async () => {
      page = await global.__BROWSER__.newPage();
      await page.goto('https://google.com');
    }, timeout);

    it('should load without error', async () => {
      await expect(page.title()).resolves.toMatch('Google');
    });
  },
  timeout,
);
```

Here's the code of [full working example](https://github.com/xfumihiro/jest-puppeteer-example).
