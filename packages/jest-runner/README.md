# jest-runner

`jest-runner` is a package that can be used to create custom Jest runners. Runners are used to control which tests run.

```js
const TestRunner = require('jest-runner');

class myCustomJestRunner extends TestRunner {
  constructor(globalConfig, context) {
    super(globalConfig, context);
  }

  async runTests(tests, watcher, onStart, onResult, onFailure, options) {
    const filteredTests = tests.filter(test => test.path.includes('e2e'));

    super(filteredTests, watcher, onStart, onResult, onFailure, options);
  }
}
```

`jest-runner` can:

- Intercept test collections before they are ran.
- Modify the Jest-Config per test file. This includes controlling the `testNamePattern` of each test file.

## Installation

```sh
# with yarn
$ yarn add jest-runner
# with npm
$ npm install jest-runner
```

<!-- ⚠️ TODO ⚠️

- Add config example.

## Usage

```js
const TestRunner = require('jest-runner');

const docblock = extract(code);
console.log(docblock); // "/**\n * Everything is awesome!\n * \n * @everything is:awesome\n * @flow\n */"

const stripped = strip(code);
console.log(stripped); // "export const everything = Object.create(null);\n export default function isAwesome(something) {\n return something === everything;\n }"

const pragmas = parse(docblock);
console.log(pragmas); // { everything: "is:awesome", flow: "" }

const parsed = parseWithComments(docblock);
console.log(parsed); // { comments: "Everything is awesome!", pragmas: { everything: "is:awesome", flow: "" } }

console.log(print({pragmas, comments: 'hi!'})); // /**\n * hi!\n *\n * @everything is:awesome\n * @flow\n */;
```

## API Documentation

### `extract(contents: string): string`

Extracts a docblock from some file contents. Returns the docblock contained in `contents`. If `contents` did not contain a docblock, it will return the empty string (`""`).

### `strip(contents: string): string`

Strips the top docblock from a file and return the result. If a file does not have a docblock at the top, then return the file unchanged.

### `parse(docblock: string): {[key: string]: string | string[] }`

Parses the pragmas in a docblock string into an object whose keys are the pragma tags and whose values are the arguments to those pragmas.

### `parseWithComments(docblock: string): { comments: string, pragmas: {[key: string]: string | string[]} }`

Similar to `parse` except this method also returns the comments from the docblock. Useful when used with `print()`.

### `print({ comments?: string, pragmas?: {[key: string]: string | string[]} }): string`

Prints an object of key-value pairs back into a docblock. If `comments` are provided, they will be positioned on the top of the docblock. -->
