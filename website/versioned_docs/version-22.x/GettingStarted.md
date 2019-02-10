---
id: version-22.x-getting-started
title: Getting Started
original_id: getting-started
---

Install Jest using [`yarn`](https://yarnpkg.com/en/package/jest):

```bash
yarn add --dev jest
```

Or [`npm`](https://www.npmjs.com/):

```bash
npm install --save-dev jest
```

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

Finally, run `yarn test` and Jest will print this message:

```bash
PASS  ./sum.test.js
✓ adds 1 + 2 to equal 3 (5ms)
```

**You just successfully wrote your first test using Jest!**

This test used `expect` and `toBe` to test that two values were exactly identical. To learn about the other things that Jest can test, see [Using Matchers](UsingMatchers.md).

## Running from command line

You can run Jest directly from the CLI (if it's globally available in your `PATH`, e.g. by `yarn global add jest`) with variety of useful options.

Here's how to run Jest on files matching `my-test`, using `config.json` as a configuration file and display a native OS notification after the run:

```bash
jest my-test --notify --config=config.json
```

If you'd like to learn more about running `jest` through the command line, take a look at the [Jest CLI Options](CLI.md) page.

## Additional Configuration

### Using Babel

To use [Babel](https://babeljs.io/), install the `babel-jest` and `regenerator-runtime` packages:

```bash
yarn add --dev babel-jest babel-core regenerator-runtime
```

> Note: If you are using Babel version 7 then you need to install `babel-jest`, `babel-core@^7.0.0-bridge.0` and `@babel/core` with the following command:
>
> ```bash
> yarn add --dev babel-jest babel-core@^7.0.0-bridge.0 @babel/core regenerator-runtime
> ```
>
> You will need to use `babel.config.js` in order to transpile `node_modules`. See https://babeljs.io/docs/en/next/config-files for more information.
>
> You can also see the example in the Jest repository: https://github.com/facebook/jest/tree/54f4d4ebd3d1a11d65962169f493ce41efdd784f/examples/babel-7

_Note: Explicitly installing `regenerator-runtime` is not needed if you use `npm` 3 or 4 or Yarn_

Don't forget to add a [`.babelrc`](https://babeljs.io/docs/usage/babelrc/) file in your project's root folder. For example, if you are using ES6 and [React.js](https://facebook.github.io/react/) with the [`babel-preset-env`](https://babeljs.io/docs/plugins/preset-env/) and [`babel-preset-react`](https://babeljs.io/docs/plugins/preset-react/) presets:

```json
{
  "presets": ["env", "react"]
}
```

You are now set up to use all ES6 features and React specific syntax.

> Note: If you are using a more complicated Babel configuration, using Babel's `env` option, keep in mind that Jest will automatically define `NODE_ENV` as `test`. It will not use `development` section like Babel does by default when no `NODE_ENV` is set.

> Note: If you've turned off transpilation of ES6 modules with the option `{ "modules": false }`, you have to make sure to turn this on in your test environment.

```json
{
  "presets": [["env", {"modules": false}], "react"],
  "env": {
    "test": {
      "presets": [["env"], "react"]
    }
  }
}
```

> Note: `babel-jest` is automatically installed when installing Jest and will automatically transform files if a babel configuration exists in your project. To avoid this behavior, you can explicitly reset the `transform` configuration option:

```json
// package.json
{
  "jest": {
    "transform": {}
  }
}
```

### Using webpack

Jest can be used in projects that use [webpack](https://webpack.github.io/) to manage assets, styles, and compilation. webpack does offer some unique challenges over other tools. Refer to the [webpack guide](Webpack.md) to get started.

### Using TypeScript

To use TypeScript in your tests you can use [ts-jest](https://github.com/kulshekhar/ts-jest).
