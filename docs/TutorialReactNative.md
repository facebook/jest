---
id: tutorial-react-native
title: Testing React Native Apps
---

At Facebook, we use Jest to test [React Native](http://facebook.github.io/react-native/) applications.

Get a deeper insight into testing a working React Native app example by reading the following series: [Part 1: Jest – Snapshot come into play](https://blog.callstack.io/unit-testing-react-native-with-the-new-jest-i-snapshots-come-into-play-68ba19b1b9fe#.12zbnbgwc) and [Part 2: Jest – Redux Snapshots for your Actions and Reducers](https://blog.callstack.io/unit-testing-react-native-with-the-new-jest-ii-redux-snapshots-for-your-actions-and-reducers-8559f6f8050b).

## Setup

Starting from react-native version 0.38, a Jest setup is included by default when running `react-native init`. The following configuration should be automatically added to your package.json file:

```json
// package.json
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "react-native"
  }
```

_Note: If you are upgrading your react-native application and previously used the `jest-react-native` preset, remove the dependency from your `package.json` file and change the preset to `react-native` instead._

Simply run `yarn test` to run tests with Jest.

## Snapshot Test

Let's create a [snapshot test](SnapshotTesting.md) for a small intro component with a few views and text components and some styles:

```javascript
// Intro.js
import React, {Component} from 'react';
import {StyleSheet, Text, View} from 'react-native';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    flex: 1,
    justifyContent: 'center',
  },
  instructions: {
    color: '#333333',
    marginBottom: 5,
    textAlign: 'center',
  },
  welcome: {
    fontSize: 20,
    margin: 10,
    textAlign: 'center',
  },
});

export default class Intro extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to React Native!</Text>
        <Text style={styles.instructions}>
          This is a React Native snapshot test.
        </Text>
      </View>
    );
  }
}
```

Now let's use React's test renderer and Jest's snapshot feature to interact with the component and capture the rendered output and create a snapshot file:

```javascript
// __tests__/Intro-test.js
import React from 'react';
import Intro from '../Intro';

import renderer from 'react-test-renderer';

test('renders correctly', () => {
  const tree = renderer.create(<Intro />).toJSON();
  expect(tree).toMatchSnapshot();
});
```

When you run `yarn test` or `jest`, this will produce an output file like this:

```javascript
// __tests__/__snapshots__/Intro-test.js.snap
exports[`Intro renders correctly 1`] = `
<View
  style={
    Object {
      "alignItems": "center",
      "backgroundColor": "#F5FCFF",
      "flex": 1,
      "justifyContent": "center",
    }
  }>
  <Text
    style={
      Object {
        "fontSize": 20,
        "margin": 10,
        "textAlign": "center",
      }
    }>
    Welcome to React Native!
  </Text>
  <Text
    style={
      Object {
        "color": "#333333",
        "marginBottom": 5,
        "textAlign": "center",
      }
    }>
    This is a React Native snapshot test.
  </Text>
</View>
`;
```

The next time you run the tests, the rendered output will be compared to the previously created snapshot. The snapshot should be committed along code changes. When a snapshot test fails, you need to inspect whether it is an intended or unintended change. If the change is expected you can invoke Jest with `jest -u` to overwrite the existing snapshot.

The code for this example is available at [examples/react-native](https://github.com/facebook/jest/tree/master/examples/react-native).

## Preset configuration

The preset sets up the environment and is very opinionated and based on what we found to be useful at Facebook. All of the configuration options can be overwritten just as they can be customized when no preset is used.

### Environment

`react-native` ships with a Jest preset, so the `jest.preset` field of your `package.json` should point to `react-native`. The preset is a node environment that mimics the environment of a React Native app. Because it doesn't load any DOM or browser APIs, it greatly improves Jest's startup time.

### transformIgnorePatterns customization

The [`transformIgnorePatterns`](configuration.html#transformignorepatterns-array-string) option can be used to whitelist or blacklist files from being transformed with Babel. Many react-native npm modules unfortunately don't pre-compile their source code before publishing.

By default the jest-react-native preset only processes the project's own source files and react-native. If you have npm dependencies that have to be transformed you can customize this configuration option by whitelisting modules other than react-native:

```json
"transformIgnorePatterns": [
  "node_modules/(?!(react-native|my-project|react-native-button)/)"
]
```

### setupFiles

If you'd like to provide additional configuration for every test file, the [`setupFiles` configuration option](configuration.html#setupfiles-array) can be used to specify setup scripts.

### moduleNameMapper

The [`moduleNameMapper`](configuration.html#modulenamemapper-object-string-string) can be used to map a module path to a different module. By default the preset maps all images to an image stub module but if a module cannot be found this configuration option can help:

```json
"moduleNameMapper": {
  "my-module.js": "<rootDir>/path/to/my-module.js"
}
```

## Tips

### Mock native modules using jest.mock

The Jest preset built into `react-native` comes with a few default mocks that are applied on a react-native repository. However some react-native components or third party components rely on native code to be rendered. In such cases, Jest's manual mocking system can help to mock out the underlying implementation.

For example, if your code depends on a third party native video component called `react-native-video` you might want to stub it out with a manual mock like this:

```js
jest.mock('react-native-video', () => 'Video');
```

This will render the component as `<Video {...props} />` with all of its props in the snapshot output. See also [caveats around Enzyme and React 16](tutorial-react.html#snapshot-testing-with-mocks-enzyme-and-react-16).

Sometimes you need to provide a more complex manual mock. For example if you'd like to forward the prop types or static fields of a native component to a mock, you can return a different React component from a mock through this helper from jest-react-native:

```js
jest.mock('path/to/MyNativeComponent', () => {
  const mockComponent = require('react-native/jest/mockComponent');
  return mockComponent('path/to/MyNativeComponent');
});
```

Or if you'd like to create your own manual mock, you can do something like this:

```js
jest.mock('Text', () => {
  const RealComponent = jest.requireActual('Text');
  const React = require('React');
  class Text extends React.Component {
    render() {
      return React.createElement('Text', this.props, this.props.children);
    }
  }
  Text.propTypes = RealComponent.propTypes;
  return Text;
});
```

In other cases you may want to mock a native module that isn't a React component. The same technique can be applied. We recommend inspecting the native module's source code and logging the module when running a react native app on a real device and then modeling a manual mock after the real module.

If you end up mocking the same modules over and over it is recommended to define these mocks in a separate file and add it to the list of `setupFiles`.
