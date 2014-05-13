/**
 * @generated
 * @jsx React.DOM
 */
var React = require("React");
var layout = require("DocsLayout");
module.exports = React.createClass({
  render: function() {
    return layout({metadata: {"id":"manual-mocks","title":"Manual mocks","layout":"docs","category":"Reference","permalink":"docs/manual-mocks.html","next":"timer-mocks"}}, `
Although autogeneration of mocks is convenient, there are behaviors it misses, such as [fluent interfaces](http://martinfowler.com/bliki/FluentInterface.html). Furthermore, providing useful helpers on mock versions of a module, especially a core module, promotes reuse and can help to hide implementation details.

Manual mocks are defined by writing a module in a \`__mocks__/\` subdirectory immediately adjacent to the module. When a manual mock exists for a given module, Jest's module system will just use that instead of trying to automatically generating a mock.

Here's a contrived example where we have a module that provides a summary of all the files in a given directory.

\`\`\`javascript
// FileSummarizer.js
var fs = require('fs');

function summarizeFilesInDirectorySync(directoryPath) {
  return fs.readdirSync(directoryPath).map(function(fileName) {
    return {
      fileName: fileName,
      directory: directoryPath
    };
  });
  return directoryFileSummary;
}

exports.summarizeFilesInDirectorySync = summarizeFilesInDirectorySync;
\`\`\`

Since we'd like our tests to avoid actually hitting the disk (that's pretty slow and fragile), we create a manual mock for the \`fs\` module that implements custom versions of the \`fs\` APIs that we can build on for our tests:

\`\`\`javascript
// __mocks__/fs.js

// Get the real (not mocked) version of the 'path' module
var path = require.requireActual('path');

// This is a custom function that our tests can use during setup to specify
// what the files on the "mock" filesystem should look like when any of the
// \`fs\` APIs are used.
var _mockFiles = {};
function __setMockFiles(newMockFiles) {
  _mockFiles = {};
  for (var file in newMockFiles) {
    var dir = path.dirname(file);

    if (!_mockFiles[dir]) {
      _mockFiles[dir] = [];
    }

    _mockFiles[dir].push(path.basename(file));
  }
};

// A custom version of \`readdirSync\` that reads from the special mocked out
// file list set via __setMockFiles
function readdirSync(directoryPath) {
  return _mockFiles[directoryPath] || [];
};

exports.__setMockFiles = __setMockFiles;
exports.readdirSync = readdirSync;
\`\`\`

Now we write our test:

\`\`\`javascript
jest.dontMock('../FileSummarizer');

describe('FileSummarizer', function() {
  describe('listFilesInDirectorySync', function() {
    var MOCK_FILE_INFO = {
      '/path/to/file1.js':
        'console.log("file1 contents");',

      '/path/to/file2.txt':
        "file2 contents"
    };

    beforeEach(function() {
      // Set up some mocked out file info before each test
      require('fs').__setMockFiles(MOCK_FILE_INFO);
    });

    it('includes all files in the directory in the summary', function() {
      var FileSummarizer = require('../FileSummarizer');
      var fileSummary = FileSummarizer.summarizeFilesInDirectorySync(
        '/path/to'
      );

      expect(fileSummary.length).toBe(2);
    });
  });
});
\`\`\`

As you can see, it's sometimes useful to do more than what the automatic mocker is capable of doing for us. However one downside to manual mocks that you should keep in mind is that manual mocks are manual -- meaning you have to manually update them any time the module they are mocking changes. Because of this, it's best to use the automatic mocker when it will suffice for your needs.


Testing manual mocks
-------------

It's generally an anti-pattern to implement an elaborate, stateful mock for a module. Before going down this route, consider covering the real module completely with tests and then whitelisting it with [\`config.unmockedModulePathPatterns\`](/jest/docs/api.html#config-unmockedmodulepathpatterns-array-string), so that any tests that \`require()\` it will always get the real implementation (rather than a complicated mock version).

In cases where this kind of elaborate mock is unavoidable, it's not necessarily a bad idea to write a test that ensures that the mock and the actual implementation are in sync. Luckily, this is relatively easy to do with the API provided by \`jest\`, which allows you to explicitly require both the real module (using \`require.requireActual()\`) and the manually mocked implementation of the module (using \`require()\`) in a single test!
`);
  }
});
