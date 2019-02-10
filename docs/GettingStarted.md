---
id: getting-started
title: Getting Started
---

Install Jest using [`yarn`](https://yarnpkg.com/en/package/jest):

```bash
yarn add --dev jest
```

Or [`npm`](https://www.npmjs.com/):

```bash
npm install --save-dev jest
```

Note: Jest documentation uses `yarn` commands, but `npm` will also work. You can compare `yarn` and `npm` commands in the [yarn docs, here](https://yarnpkg.com/en/docs/migrating-from-npm#toc-cli-commands-comparison).

Let's get started by writing a test for a hypothetical function that adds two numbers. First, create a `sum.js` file:

```javascript
function sum(a, b) {
  return a + b;
}
module.exports = sum;
```

Then, create a file named `sum.test.js`. This will contain our actual test:

```javascript
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

Add the following section to your `package.json`:

```json
{
  "scripts": {
    "test": "jest"
  }
}
```

Finally, run `yarn test` or `npm run test` and Jest will print this message:

```bash
PASS  ./sum.test.js
✓ adds 1 + 2 to equal 3 (5ms)
```

**You just successfully wrote your first test using Jest!**

This test used `expect` and `toBe` to test that two values were exactly identical. To learn about the other things that Jest can test, see [Using Matchers](UsingMatchers.md).

## Running from command line

You can run Jest directly from the CLI (if it's globally available in your `PATH`, e.g. by `yarn global add jest` or `npm install jest --global`) with a variety of useful options.

Here's how to run Jest on files matching `my-test`, using `config.json` as a configuration file and display a native OS notification after the run:

```bash
jest my-test --notify --config=config.json
```

If you'd like to learn more about running `jest` through the command line, take a look at the [Jest CLI Options](CLI.md) page.

## Additional Configuration

### Generate a basic configuration file

Based on your project, Jest will ask you a few questions and will create a basic configuration file with a short description for each option:

```bash
jest --init
```

### Using Babel

To use [Babel](http://babeljs.io/), install required dependencies via `yarn`:

```bash
yarn add --dev babel-jest @babel/core @babel/preset-env
```

Configure Babel to target your current version of Node by creating a `babel.config.js` file in the root of your project:

```javascript
// babel.config.js
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
};
```

**The ideal configuration for Babel will depend on your project.** See [Babel's docs](https://babeljs.io/docs/en/) for more details.

Jest will set `process.env.NODE_ENV` to `'test'` if it's not set to something else. You can use that in your configuration to conditionally setup only the compilation needed for Jest, e.g.

```javascript
// babel.config.js
module.exports = api => {
  const isTest = api.env('test');
  // You can use isTest to determine what presets and plugins to use.

  return {
    // ...
  };
};
```

> Note: `babel-jest` is automatically installed when installing Jest and will automatically transform files if a babel configuration exists in your project. To avoid this behavior, you can explicitly reset the `transform` configuration option:

```javascript
// jest.config.js
module.exports = {
  transform: {},
};
```

#### Babel 6

Jest 24 dropped support for Babel 6. We highly recommend you to upgrade to Babel 7, which is actively maintained. However, if you cannot upgrade to Babel 7, either keep using Jest 23 or upgrade to Jest 24 with `babel-jest` locked at version 23, like in the example below:

```
"dependencies": {
  "babel-core": "^6.26.3",
  "babel-jest": "^23.6.0",
  "babel-preset-env": "^1.7.0",
  "jest": "^24.0.0"
}
```

While we generally recommend using the same version of every Jest package, this workaround will allow you to continue using the latest version of Jest with Babel 6 for now.

### Using webpack

Jest can be used in projects that use [webpack](https://webpack.github.io/) to manage assets, styles, and compilation. webpack does offer some unique challenges over other tools. Refer to the [webpack guide](Webpack.md) to get started.

### Using TypeScript

Jest supports TypeScript out of the box, via Babel.

However, there are some caveats to using Typescript with Babel, see http://artsy.github.io/blog/2017/11/27/Babel-7-and-TypeScript/. Another caveat is that Jest will not typecheck your tests. If you want that, you can use [ts-jest](https://github.com/kulshekhar/ts-jest).
