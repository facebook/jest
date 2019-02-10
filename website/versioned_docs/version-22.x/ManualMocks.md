---
id: version-22.x-manual-mocks
title: Manual Mocks
original_id: manual-mocks
---

Manual mocks are used to stub out functionality with mock data. For example, instead of accessing a remote resource like a website or a database, you might want to create a manual mock that allows you to use fake data. This ensures your tests will be fast and not flaky.

## Mocking user modules

Manual mocks are defined by writing a module in a `__mocks__/` subdirectory immediately adjacent to the module. For example, to mock a module called `user` in the `models` directory, create a file called `user.js` and put it in the `models/__mocks__` directory. Note that the `__mocks__` folder is case-sensitive, so naming the directory `__MOCKS__` will break on some systems.

> When we require that module in our tests, then explicitly calling `jest.mock('./moduleName')` is **required**.

## Mocking Node modules

If the module you are mocking is a Node module (e.g.: `lodash`), the mock should be placed in the `__mocks__` directory adjacent to `node_modules` (unless you configured [`roots`](Configuration.md#roots-array-string) to point to a folder other than the project root) and will be **automatically** mocked. There's no need to explicitly call `jest.mock('module_name')`.

Scoped modules can be mocked by creating a file in a directory structure that matches the name of the scoped module. For example, to mock a scoped module called `@scope/project-name`, create a file at `__mocks__/@scope/project-name.js`, creating the `@scope/` directory accordingly.

> Warning: If we want to mock Node's core modules (e.g.: `fs` or `path`), then explicitly calling e.g. `jest.mock('path')` is **required**, because core Node modules are not mocked by default.

## Examples

```bash
.
├── config
├── __mocks__
│   └── fs.js
├── models
│   ├── __mocks__
│   │   └── user.js
│   └── user.js
├── node_modules
└── views
```

When a manual mock exists for a given module, Jest's module system will use that module when explicitly calling `jest.mock('moduleName')`. However, manual mocks will take precedence over node modules even if `jest.mock('moduleName')` is not called. To opt out of this behavior you will need to explicitly call `jest.unmock('moduleName')` in tests that should use the actual module implementation.

Here's a contrived example where we have a module that provides a summary of all the files in a given directory. In this case we use the core (built in) `fs` module.

```javascript
// FileSummarizer.js
'use strict';

const fs = require('fs');

function summarizeFilesInDirectorySync(directory) {
  return fs.readdirSync(directory).map(fileName => ({
    directory,
    fileName,
  }));
}

exports.summarizeFilesInDirectorySync = summarizeFilesInDirectorySync;
```

Since we'd like our tests to avoid actually hitting the disk (that's pretty slow and fragile), we create a manual mock for the `fs` module by extending an automatic mock. Our manual mock will implement custom versions of the `fs` APIs that we can build on for our tests:

```javascript
// __mocks__/fs.js
'use strict';

const path = require('path');

const fs = jest.genMockFromModule('fs');

// This is a custom function that our tests can use during setup to specify
// what the files on the "mock" filesystem should look like when any of the
// `fs` APIs are used.
let mockFiles = Object.create(null);
function __setMockFiles(newMockFiles) {
  mockFiles = Object.create(null);
  for (const file in newMockFiles) {
    const dir = path.dirname(file);

    if (!mockFiles[dir]) {
      mockFiles[dir] = [];
    }
    mockFiles[dir].push(path.basename(file));
  }
}

// A custom version of `readdirSync` that reads from the special mocked out
// file list set via __setMockFiles
function readdirSync(directoryPath) {
  return mockFiles[directoryPath] || [];
}

fs.__setMockFiles = __setMockFiles;
fs.readdirSync = readdirSync;

module.exports = fs;
```

Now we write our test. Note that we need to explicitly tell that we want to mock the `fs` module because it’s a core Node module:

```javascript
// __tests__/FileSummarizer-test.js
'use strict';

jest.mock('fs');

describe('listFilesInDirectorySync', () => {
  const MOCK_FILE_INFO = {
    '/path/to/file1.js': 'console.log("file1 contents");',
    '/path/to/file2.txt': 'file2 contents',
  };

  beforeEach(() => {
    // Set up some mocked out file info before each test
    require('fs').__setMockFiles(MOCK_FILE_INFO);
  });

  test('includes all files in the directory in the summary', () => {
    const FileSummarizer = require('../FileSummarizer');
    const fileSummary = FileSummarizer.summarizeFilesInDirectorySync(
      '/path/to',
    );

    expect(fileSummary.length).toBe(2);
  });
});
```

The example mock shown here uses [`jest.genMockFromModule`](JestObjectAPI.md#jestgenmockfrommodulemodulename) to generate an automatic mock, and overrides its default behavior. This is the recommended approach, but is completely optional. If you do not want to use the automatic mock at all, you can simply export your own functions from the mock file. One downside to fully manual mocks is that they're manual – meaning you have to manually update them any time the module they are mocking changes. Because of this, it's best to use or extend the automatic mock when it works for your needs.

To ensure that a manual mock and its real implementation stay in sync, it might be useful to require the real module using `jest.requireActual(moduleName)` in your manual mock and amending it with mock functions before exporting it.

The code for this example is available at [examples/manual-mocks](https://github.com/facebook/jest/tree/master/examples/manual-mocks).

## Using with ES module imports

If you're using [ES module imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) then you'll normally be inclined to put your `import` statements at the top of the test file. But often you need to instruct Jest to use a mock before modules use it. For this reason, Jest will automatically hoist `jest.mock` calls to the top of the module (before any imports). To learn more about this and see it in action, see [this repo](https://github.com/kentcdodds/how-jest-mocking-works).
