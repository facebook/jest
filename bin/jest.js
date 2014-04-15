#!/usr/bin/env node --harmony
/* jshint node: true */
"use strict";

var child_process = require('child_process');
var defaultTestResultHandler = require('../src/defaultTestResultHandler');
var fs = require('fs');
var optimist = require('optimist');
var path = require('path');
var Q = require('q');
var TestRunner = require('../src/TestRunner');
var utils = require('../src/lib/utils');

function _findChangedFiles(dirPath) {
  var deferred = Q.defer();

  var args =
    ['diff', '--name-only', '--diff-filter=ACMR'];
  var child = child_process.spawn('git', args, {cwd: dirPath});

  var stdout = '';
  child.stdout.on('data', function(data) {
    stdout += data;
  });

  var stderr = '';
  child.stderr.on('data', function(data) {
    stderr += data;
  });

  child.on('close', function(code) {
    if (code === 0) {
      stdout = stdout.trim();
      if (stdout === '') {
        deferred.resolve([]);
      } else {
        deferred.resolve(stdout.split('\n').map(function(changedPath) {
          return path.resolve(dirPath, changedPath);
        }));
      }
    } else {
      deferred.reject(code + ': ' + stderr);
    }
  });

  return deferred.promise;
}

function _onResultReady(config, result) {
  return defaultTestResultHandler(config, result);
}

function _onRunComplete(completionData) {
  var numFailedTests = completionData.numFailedTests;
  var numTotalTests = completionData.numTotalTests;
  var startTime = completionData.startTime;
  var endTime = completionData.endTime;

  console.log(numFailedTests + '/' + numTotalTests + ' tests failed');
  console.log('Run time: ' + ((endTime - startTime) / 1000) + 's');
}

function _verifyIsGitRepository(dirPath) {
  var deferred = Q.defer();

  child_process.spawn('git', ['rev-parse', '--git-dir'], {cwd: dirPath})
    .on('close', function(code) {
      var isGitRepo = code === 0;
      deferred.resolve(isGitRepo);
    });

  return deferred.promise;
}

/**
 * Takes a description string, puts it on the next line, indents it, and makes
 * sure it wraps without exceeding 80chars
 */
function _wrapDesc(desc) {
  var indent = '\n      ';
  return indent + desc.split(' ').reduce(function(wrappedDesc, word) {
    var lastLineIdx = wrappedDesc.length - 1;
    var lastLine = wrappedDesc[lastLineIdx];

    var appendedLastLine = lastLine === '' ? word : (lastLine + ' ' + word);

    if (appendedLastLine.length > 80) {
      wrappedDesc.push(word);
    } else {
      wrappedDesc[lastLineIdx] = appendedLastLine;
    }

    return wrappedDesc;
  }, ['']).join(indent);
}

var argv = optimist
  .usage('Usage: $0 [--config=<pathToConfigFile>] [TestPathRegExp]')
  .options({
    config: {
      alias: 'c',
      //demand: true,
      description: _wrapDesc(
        'The path to a jest config file specifying how to find and execute ' +
        'tests.'
      ),
      type: 'string'
    },
    coverage: {
      description: _wrapDesc(
        'Indicates that test coverage information should be collected and ' +
        'reported in the output.'
      ),
      type: 'boolean'
    },
    maxWorkers: {
      alias: 'w',
      description: _wrapDesc(
        'Specifies the maximum number of workers the worker-pool will spawn ' +
        'for running tests. This defaults to the number of the cores ' +
        'available on your machine. (its usually best not to override this ' +
        'default)'
      ),
      type: 'string' // no, optimist -- its a number.. :(
    },
    onlyChanged: {
      alias: 'o',
      description: _wrapDesc(
        'Attempts to identify which tests to run based on which files have ' +
        'changed in the current repository. Only works if you\'re running ' +
        'tests in a git repository at the moment.'
      ),
      type: 'boolean'
    },
    runInBand: {
      alias: 'i',
      description: _wrapDesc(
        'Run all tests serially in the current process (rather than creating ' +
        'a worker pool of child processes that run tests). This is sometimes ' +
        'useful for debugging, but such use cases are pretty rare.'
      ),
      type: 'boolean'
    }
  })
  .check(function(argv) {
    if (argv.runInBand && argv.hasOwnProperty('maxWorkers')) {
      throw (
        "Both --runInBand and --maxWorkers were specified, but these two " +
        "options don't make sense together. Which is it?"
      );
    }

    if (argv.onlyChanged && argv._.length > 0) {
      throw (
        "Both --onlyChanged and a path pattern were specified, but these two " +
        "options don't make sense together. Which is it? Do you want to run " +
        "tests for changed files? Or for a specific set of files?"
      );
    }
  })
  .argv

var config;
if (argv.config) {
  config = utils.loadConfigFromFile(argv.config);
} else {
  var cwd = process.cwd();

  var pkgJsonPath = path.join(cwd, 'package.json');
  var pkgJson = fs.existsSync(pkgJsonPath) ? require(pkgJsonPath) : {};
  var testCfgPath = path.join(cwd, 'jestConfig.json');

  // First look to see if there is a testConfig.json file here
  if (fs.existsSync(testCfgPath)) {
    config = Q(utils.normalizeConfig(require(testCfgPath), cwd));

  // Next look to see if there's a package.json file here
  } else if (pkgJson.jestConfig) {
    config = Q(utils.normalizeConfig(pkgJson.jestConfig, cwd));

  // Lastly, use a sane default config
  } else {
    config = Q(utils.normalizeConfig({
      projectName: cwd.replace(/[/\\]/g, '_'),
      testPathDirs: [cwd],
      testPathIgnores: ['/node_modules/.+']
    }, cwd));
  }
}

config.done(function(config) {
  var pathPattern =
    argv._.length === 0
    ? /.*/
    : new RegExp(argv._.join('|'));

  var testRunnerOpts = {};
  if (argv.maxWorkers) {
    testRunnerOpts.maxWorkers = argv.maxWorkers;
  }

  if (argv.coverage) {
    config.collectCoverage = true;
  }

  var testRunner = new TestRunner(config, testRunnerOpts);

  function _runTestsOnPathPattern(pathPattern) {
    if (argv.runInBand) {
      console.log('Running tests serially in the current node process...');
      testRunner
        .runAllMatchingInBand(pathPattern, _onResultReady)
        .done(_onRunComplete);
    } else {
      testRunner
        .runAllMatchingParallel(pathPattern, _onResultReady)
        .done(_onRunComplete);
    }
  }

  if (argv.onlyChanged) {
    console.log('Looking for changed files...');

    var testPathDirsAreGit = config.testPathDirs.map(_verifyIsGitRepository);
    Q.all(testPathDirsAreGit).then(function(results) {
      if (!results.every(function(result) { return result; })) {
        console.error(
          'It appears that one of your testPathDirs does not exist ' +
          'with in a git repository. Currently --onlyChanged only works ' +
          'with git projects.\n'
        );
        process.exit(1);
      }

      return Q.all(config.testPathDirs.map(_findChangedFiles));
    }).then(function(changedPathSets) {
      // Collapse changed files from each of the testPathDirs into a single list
      // of changed file paths
      var changedPaths = [];
      changedPathSets.forEach(function(pathSet) {
        changedPaths = changedPaths.concat(pathSet);
      });
      return testRunner.findTestsRelatedTo(changedPaths);
    }).done(function(affectedTestPaths) {
      if (affectedTestPaths.length > 0) {
        _runTestsOnPathPattern(new RegExp(affectedTestPaths.join('|')));
      } else {
        console.log('No tests to run!');
      }
    });
  } else {
    _runTestsOnPathPattern(pathPattern);
  }
});
