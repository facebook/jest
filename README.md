<h1 align="center">
  <img src="https://jestjs.io/img/jest.png" height="150" width="150"/>
  <p align="center">Jest</p>
  <p align="center" style="font-size: 0.5em">🃏 Delightful JavaScript Testing</p>
</h1>

<p align="center">
    <a href="https://circleci.com/gh/facebook/jest"><img src="https://circleci.com/gh/facebook/jest.svg?style=shield" alt="CircleCI Build Status"></a>
    <a href="https://dev.azure.com/jestjs/jest/_build/latest?definitionId=1?branchName=master"><img src="https://dev.azure.com/jestjs/jest/_apis/build/status/facebook.jest?branchName=master" alt="Azure Pipelines Build Status"></a>
    <a href="https://travis-ci.org/facebook/jest"><img src="https://travis-ci.org/facebook/jest.svg?branch=master" alt="Travis Build Status"></a>
    <a href="https://ci.appveyor.com/project/Daniel15/jest/branch/master"><img src="https://ci.appveyor.com/api/projects/status/8n38o44k585hhvhd/branch/master?svg=true" alt="Windows Build Status"></a>
    <a href="https://codecov.io/gh/facebook/jest"><img src="https://codecov.io/gh/facebook/jest/branch/master/graph/badge.svg" alt="Codecov badge"></a>
    <a href="http://badge.fury.io/js/jest"><img src="https://badge.fury.io/js/jest.svg" alt="npm version"></a>
    <a href="https://dependabot.com/compatibility-score.html?dependency-name=jest&amp;package-manager=npm_and_yarn&amp;version-scheme=semver"><img src="https://api.dependabot.com/badges/compatibility_score?dependency-name=jest&amp;package-manager=npm_and_yarn&amp;version-scheme=semver" alt="SemVer">
    <a href="https://twitter.com/acdlite/status/974390255393505280"><img src="https://img.shields.io/badge/speed-blazing%20%F0%9F%94%A5-brightgreen.svg" alt="Blazing Fast"></a>
</p>
<p align="center">
    <a href="#backers"><img src="https://opencollective.com/jest/backers/badge.svg" alt="Backers on Open Collective"></a>
    <a href="#sponsors"><img src="https://opencollective.com/jest/sponsors/badge.svg" alt="Sponsors on Open Collective"></a>
    <a href="https://github.com/facebook/jest/blob/master/CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs%20-welcome-brightgreen.svg" alt="PR's welcome"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
     <a href="https://snyk.io/test/github/facebook/jest?targetFile=packages/jest/package.json"><img src="https://snyk.io/test/github/facebook/jest/badge.svg?targetFile=packages/jest/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/facebook/jest?targetFile=packages/jest/package.json" style="max-width:100%;"></a>
</p>
<p align="center">
    <a href="https://twitter.com/intent/follow?screen_name=fbjest"><img src="https://img.shields.io/twitter/follow/fbjest.svg?style=social&label=Follow%20@fbjest" alt="Follow on Twitter"></a>  
</p>

**👩🏻‍💻 Developer Ready**: Complete and ready to set-up JavaScript testing solution. Works out of the box for any React project.

**🏃🏽 Instant Feedback**: Fast interactive watch mode runs only test files related to changed files and is optimized to give signal quickly.

**📸 Snapshot Testing**: Capture snapshots of React trees or other serializable values to simplify testing and to analyze how state changes over time.

## Getting Started

<!-- copied from Getting Started docs, links updated to point to Jest website -->

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

This test used `expect` and `toBe` to test that two values were exactly identical. To learn about the other things that Jest can test, see [Using Matchers](https://jestjs.io/docs/using-matchers).

## Running from command line

You can run Jest directly from the CLI (if it's globally available in your `PATH`, e.g. by `yarn global add jest` or `npm install jest --global`) with a variety of useful options.

Here's how to run Jest on files matching `my-test`, using `config.json` as a configuration file and display a native OS notification after the run:

```bash
jest my-test --notify --config=config.json
```

If you'd like to learn more about running `jest` through the command line, take a look at the [Jest CLI Options](https://jestjs.io/docs/en/cli) page.

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

Jest can be used in projects that use [webpack](https://webpack.github.io/) to manage assets, styles, and compilation. webpack does offer some unique challenges over other tools. Refer to the [webpack guide](https://jestjs.io/docs/en/webpack) to get started.

### Using TypeScript

Jest supports TypeScript out of the box, via Babel.

However, there are some caveats to using Typescript with Babel, see http://artsy.github.io/blog/2017/11/27/Babel-7-and-TypeScript/. Another caveat is that Jest will not typecheck your tests. If you want that, you can use [ts-jest](https://github.com/kulshekhar/ts-jest).

<!-- end copied -->

## Documentation

Learn more about using [Jest on the official site!](https://jestjs.io)

- [Getting Started](https://jestjs.io/docs/en/getting-started)
- [Guides](https://jestjs.io/docs/en/snapshot-testing)
- [API Reference](https://jestjs.io/docs/en/api)
- [Configuring Jest](https://jestjs.io/docs/en/configuration)

## Badge

Show the world you're using _Jest_ → [![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest) [![jest](https://jestjs.io/img/jest-badge.svg)](https://github.com/facebook/jest)

```md
[![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest) [![jest](https://jestjs.io/img/jest-badge.svg)](https://github.com/facebook/jest)
```

## Contributing

Development of Jest happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving Jest.

### [Code of Conduct](https://code.facebook.com/codeofconduct)

Facebook has adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](https://code.facebook.com/codeofconduct) so that you can understand what actions will and will not be tolerated.

### [Contributing Guide](CONTRIBUTING.md)

Read our [contributing guide](CONTRIBUTING.md) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes to Jest.

### [Good First Issues](https://github.com/facebook/jest/labels/%3Awave%3A%20Good%20First%20Issue)

To help you get your feet wet and get you familiar with our contribution process, we have a list of [good first issues](https://github.com/facebook/jest/labels/%3Awave%3A%20Good%20First%20Issue) that contain bugs which have a relatively limited scope. This is a great place to get started.

## Credits

This project exists thanks to all the people who [contribute](CONTRIBUTING.md). <a href="https://github.com/facebook/jest/graphs/contributors"><img src="https://opencollective.com/jest/contributors.svg?width=890&button=false" /></a>

### [Backers](https://opencollective.com/jest#backer)

Thank you to all our backers! 🙏

<a href="https://opencollective.com/jest#backers" target="_blank"><img src="https://opencollective.com/jest/backers.svg?width=890"></a>

### [Sponsors](https://opencollective.com/jest#sponsor)

Support this project by becoming a sponsor. Your logo will show up here with a link to your website.

<a href="https://opencollective.com/jest/sponsor/0/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/0/avatar.svg"></a> <a href="https://opencollective.com/jest/sponsor/1/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/1/avatar.svg"></a> <a href="https://opencollective.com/jest/sponsor/2/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/2/avatar.svg"></a> <a href="https://opencollective.com/jest/sponsor/3/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/3/avatar.svg"></a> <a href="https://opencollective.com/jest/sponsor/4/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/4/avatar.svg"></a> <a href="https://opencollective.com/jest/sponsor/5/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/5/avatar.svg"></a> <a href="https://opencollective.com/jest/sponsor/6/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/6/avatar.svg"></a> <a href="https://opencollective.com/jest/sponsor/7/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/7/avatar.svg"></a> <a href="https://opencollective.com/jest/sponsor/8/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/8/avatar.svg"></a> <a href="https://opencollective.com/jest/sponsor/9/website" target="_blank"><img src="https://opencollective.com/jest/sponsor/9/avatar.svg"></a>

## License

Jest is [MIT licensed](./LICENSE).
