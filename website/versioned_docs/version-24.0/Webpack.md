---
id: version-24.0-webpack
title: Using with webpack
original_id: webpack
---

Jest can be used in projects that use [webpack](https://webpack.js.org/) to manage assets, styles, and compilation. webpack _does_ offer some unique challenges over other tools because it integrates directly with your application to allow managing stylesheets, assets like images and fonts, along with the expansive ecosystem of compile-to-JavaScript languages and tools.

## A webpack example

Let's start with a common sort of webpack config file and translate it to a Jest setup.

```js
// webpack.config.js
module.exports = {
  module: {
    loaders: [
      {exclude: ['node_modules'], loader: 'babel', test: /\.jsx?$/},
      {loader: 'style-loader!css-loader', test: /\.css$/},
      {loader: 'url-loader', test: /\.gif$/},
      {loader: 'file-loader', test: /\.(ttf|eot|svg)$/},
    ],
  },
  resolve: {
    alias: {
      config$: './configs/app-config.js',
      react: './vendor/react-master',
    },
    extensions: ['', 'js', 'jsx'],
    modules: [
      'node_modules',
      'bower_components',
      'shared',
      '/shared/vendor/modules',
    ],
  },
};
```

If you have JavaScript files that are transformed by Babel, you can [enable support for Babel](GettingStarted.md#using-babel) by installing the `babel-jest` plugin. Non-Babel JavaScript transformations can be handled with Jest's [`transform`](Configuration.md#transform-object-string-string) config option.

### Handling Static Assets

Next, let's configure Jest to gracefully handle asset files such as stylesheets and images. Usually, these files aren't particularly useful in tests so we can safely mock them out. However, if you are using CSS Modules then it's better to mock a proxy for your className lookups.

```json
// package.json
{
  "jest": {
    "moduleNameMapper": {
      "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.js",
      "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js"
    }
  }
}
```

And the mock files themselves:

```js
// __mocks__/styleMock.js

module.exports = {};
```

```js
// __mocks__/fileMock.js

module.exports = 'test-file-stub';
```

### Mocking CSS Modules

You can use an [ES6 Proxy](https://github.com/keyanzhang/identity-obj-proxy) to mock [CSS Modules](https://github.com/css-modules/css-modules):

```bash
yarn add --dev identity-obj-proxy
```

Then all your className lookups on the styles object will be returned as-is (e.g., `styles.foobar === 'foobar'`). This is pretty handy for React [Snapshot Testing](SnapshotTesting.md).

```json
// package.json (for CSS Modules)
{
  "jest": {
    "moduleNameMapper": {
      "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.js",
      "\\.(css|less)$": "identity-obj-proxy"
    }
  }
}
```

> Notice that Proxy is enabled in Node 6 by default. If you are not on Node 6 yet, make sure you invoke Jest using `node --harmony_proxies node_modules/.bin/jest`.

If `moduleNameMapper` cannot fulfill your requirements, you can use Jest's [`transform`](Configuration.md#transform-object-string-string) config option to specify how assets are transformed. For example, a transformer that returns the basename of a file (such that `require('logo.jpg');` returns `'logo'`) can be written as:

```js
// fileTransformer.js
const path = require('path');

module.exports = {
  process(src, filename, config, options) {
    return 'module.exports = ' + JSON.stringify(path.basename(filename)) + ';';
  },
};
```

```json
// package.json (for custom transformers and CSS Modules)
{
  "jest": {
    "moduleNameMapper": {
      "\\.(css|less)$": "identity-obj-proxy"
    },
    "transform": {
      "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/fileTransformer.js"
    }
  }
}
```

We've told Jest to ignore files matching a stylesheet or image extension, and instead, require our mock files. You can adjust the regular expression to match the file types your webpack config handles.

_Note: if you are using babel-jest with additional code preprocessors, you have to explicitly define babel-jest as a transformer for your JavaScript code to map `.js` files to the babel-jest module._

```json
"transform": {
  "^.+\\.js$": "babel-jest",
  "^.+\\.css$": "custom-transformer",
  ...
}
```

### Configuring Jest to find our files

Now that Jest knows how to process our files, we need to tell it how to _find_ them. For webpack's `modulesDirectories`, and `extensions` options there are direct analogs in Jest's `moduleDirectories` and `moduleFileExtensions` options.

```json
// package.json
{
  "jest": {
    "moduleFileExtensions": ["js", "jsx"],
    "moduleDirectories": ["node_modules", "bower_components", "shared"],

    "moduleNameMapper": {
      "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js",
      "\\.(gif|ttf|eot|svg)$": "<rootDir>/__mocks__/fileMock.js"
    }
  }
}
```

> Note: `<rootDir>` is a special token that gets replaced by Jest with the root of your project. Most of the time this will be the folder where your `package.json` is located unless you specify a custom `rootDir` option in your configuration.

Similarly webpack's `resolve.root` option functions like setting the `NODE_PATH` env variable, which you can set, or make use of the `modulePaths` option.

```json
// package.json
{
  "jest": {
    "modulePaths": ["/shared/vendor/modules"],
    "moduleFileExtensions": ["js", "jsx"],
    "moduleDirectories": ["node_modules", "bower_components", "shared"],
    "moduleNameMapper": {
      "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js",
      "\\.(gif|ttf|eot|svg)$": "<rootDir>/__mocks__/fileMock.js"
    }
  }
}
```

And finally we just have the webpack `alias` left to handle. For that we can make use of the `moduleNameMapper` option again.

```json
// package.json
{
  "jest": {
    "modulePaths": ["/shared/vendor/modules"],
    "moduleFileExtensions": ["js", "jsx"],
    "moduleDirectories": ["node_modules", "bower_components", "shared"],

    "moduleNameMapper": {
      "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js",
      "\\.(gif|ttf|eot|svg)$": "<rootDir>/__mocks__/fileMock.js",

      "^react(.*)$": "<rootDir>/vendor/react-master$1",
      "^config$": "<rootDir>/configs/app-config.js"
    }
  }
}
```

That's it! webpack is a complex and flexible tool, so you may have to make some adjustments to handle your specific application's needs. Luckily for most projects, Jest should be more than flexible enough to handle your webpack config.

> Note: For more complex webpack configurations, you may also want to investigate projects such as: [babel-plugin-webpack-loaders](https://github.com/istarkov/babel-plugin-webpack-loaders).

## Using with webpack 2

webpack 2 offers native support for ES modules. However, Jest runs in Node, and thus requires ES modules to be transpiled to CommonJS modules. As such, if you are using webpack 2, you most likely will want to configure Babel to transpile ES modules to CommonJS modules only in the `test` environment.

```json
// .babelrc
{
  "presets": [["env", {"modules": false}]],

  "env": {
    "test": {
      "plugins": ["transform-es2015-modules-commonjs"]
    }
  }
}
```

> Note: Jest caches files to speed up test execution. If you updated .babelrc and Jest is still not working, try running Jest with `--no-cache`.

If you use dynamic imports (`import('some-file.js').then(module => ...)`), you need to enable the `dynamic-import-node` plugin.

```json
// .babelrc
{
  "presets": [["env", {"modules": false}]],

  "plugins": ["syntax-dynamic-import"],

  "env": {
    "test": {
      "plugins": ["dynamic-import-node"]
    }
  }
}
```

For an example of how to use Jest with Webpack with React, Redux, and Node, you can view one [here](https://github.com/jenniferkaplannyc/jest_react_redux_node_webpack_complex_example).
