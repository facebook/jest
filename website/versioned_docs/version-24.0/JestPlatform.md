---
id: version-24.0-jest-platform
title: Jest Platform
original_id: jest-platform
---

You can cherry pick specific features of Jest and use them as standalone packages. Here's a list of the available packages:

## jest-changed-files

Tool for identifying modified files in a git/hg repository. Exports two functions:

- `getChangedFilesForRoots` returns a promise that resolves to an object with the changed files and repos.
- `findRepos` returns a promise that resolves to a set of repositories contained in the specified path.

### Example

```javascript
const {getChangedFilesForRoots} = require('jest-changed-files');

// print the set of modified files since last commit in the current repo
getChangedFilesForRoots(['./'], {
  lastCommit: true,
}).then(result => console.log(result.changedFiles));
```

You can read more about `jest-changed-files` in the [readme file](https://github.com/facebook/jest/blob/master/packages/jest-changed-files/README.md).

## jest-diff

Tool for visualizing changes in data. Exports a function that compares two values of any type and returns a "pretty-printed" string illustrating the difference between the two arguments.

### Example

```javascript
const diff = require('jest-diff');

const a = {a: {b: {c: 5}}};
const b = {a: {b: {c: 6}}};

const result = diff(a, b);

// print diff
console.log(result);
```

## jest-docblock

Tool for extracting and parsing the comments at the top of a JavaScript file. Exports various functions to manipulate the data inside the comment block.

### Example

```javascript
const {parseWithComments} = require('jest-docblock');

const code = `
/**
 * This is a sample
 *
 * @flow
 */
 
 console.log('Hello World!');
`;

const parsed = parseWithComments(code);

// prints an object with two attributes: comments and pragmas.
console.log(parsed);
```

You can read more about `jest-docblock` in the [readme file](https://github.com/facebook/jest/blob/master/packages/jest-docblock/README.md).

## jest-get-type

Module that identifies the primitive type of any JavaScript value. Exports a function that returns a string with the type of the value passed as argument.

### Example

```javascript
const getType = require('jest-get-type');

const array = [1, 2, 3];
const nullValue = null;
const undefinedValue = undefined;

// prints 'array'
console.log(getType(array));
// prints 'null'
console.log(getType(nullValue));
// prints 'undefined'
console.log(getType(undefinedValue));
```

## jest-validate

Tool for validating configurations submitted by users. Exports a function that takes two arguments: the user's configuration and an object containing an example configuration and other options. The return value is an object with two attributes:

- `hasDeprecationWarnings`, a boolean indicating whether the submitted configuration has deprecation warnings,
- `isValid`, a boolean indicating whether the configuration is correct or not.

### Example

```javascript
const {validate} = require('jest-validate');

const configByUser = {
  transform: '<rootDir>/node_modules/my-custom-transform',
};

const result = validate(configByUser, {
  comment: '  Documentation: http://custom-docs.com',
  exampleConfig: {transform: '<rootDir>/node_modules/babel-jest'},
});

console.log(result);
```

You can read more about `jest-validate` in the [readme file](https://github.com/facebook/jest/blob/master/packages/jest-validate/README.md).

## jest-worker

Module used for parallelization of tasks. Exports a class `Worker` that takes the path of Node.js module and lets you call the module's exported methods as if they where class methods, returning a promise that resolves when the specified method finishes its execution in a forked process.

### Example

```javascript
// heavy-task.js

module.exports = {
  myHeavyTask: args => {
    // long running CPU intensive task.
  },
};
```

```javascript
// main.js

async function main() {
  const worker = new Worker(require.resolve('./heavy-task.js'));

  // run 2 tasks in parallel with different arguments
  const results = await Promise.all([
    worker.myHeavyTask({foo: 'bar'}),
    worker.myHeavyTask({bar: 'foo'}),
  ]);

  console.log(results);
}

main();
```

You can read more about `jest-worker` in the [readme file](https://github.com/facebook/jest/blob/master/packages/jest-worker/README.md).

## pretty-format

Exports a function that converts any JavaScript value into a human-readable string. Supports all built-in JavaScript types out of the box and allows extension for application-specific types via user-defined plugins.

### Example

```javascript
const prettyFormat = require('pretty-format');

const val = {object: {}};
val.circularReference = val;
val[Symbol('foo')] = 'foo';
val.map = new Map([['prop', 'value']]);
val.array = [-0, Infinity, NaN];

console.log(prettyFormat(val));
```

You can read more about `pretty-format` in the [readme file](https://github.com/facebook/jest/blob/master/packages/pretty-format/README.md).
