/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import {skipSuiteOnWindows} from '../../../../../scripts/ConditionalTest';

jest.mock('child_process', () => ({
  spawn: jest.fn((cmd, args) => {
    let closeCallback;
    return {
      stdout: {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            setTimeout(() => {
              callback(mockResponse);
              setTimeout(closeCallback, 0);
            }, 0);
          } else if (event === 'close') {
            closeCallback = callback;
          }
        }),
        setEncoding: jest.fn(),
      },
    };
  }),
}));

jest.mock('fs', () => {
  let mtime = 32;
  const size = 42;
  const stat = (path, callback) => {
    setTimeout(
      () =>
        callback(null, {
          isDirectory() {
            return path.endsWith('/directory');
          },
          isSymbolicLink() {
            return false;
          },
          mtime: {
            getTime() {
              return mtime++;
            },
          },
          size,
        }),
      0,
    );
  };
  return {
    lstat: jest.fn(stat),
    readdir: jest.fn((dir, callback) => {
      if (dir === '/project/fruits') {
        setTimeout(() => callback(null, ['directory', 'tomato.js']), 0);
      } else if (dir === '/project/fruits/directory') {
        setTimeout(() => callback(null, ['strawberry.js']), 0);
      } else if (dir == '/error') {
        setTimeout(() => callback({code: 'ENOTDIR'}, undefined), 0);
      }
    }),
    stat: jest.fn(stat),
  };
});

const pearMatcher = path => /pear/.test(path);
const createMap = obj => new Map(Object.keys(obj).map(key => [key, obj[key]]));

const rootDir = '/project';
let mockResponse;
let nodeCrawl;
let childProcess;

describe('node crawler', () => {
  skipSuiteOnWindows();

  beforeEach(() => {
    jest.resetModules();

    // Remove the "process.platform" property descriptor so it can be writable.
    delete process.platform;

    mockResponse = [
      '/project/fruits/pear.js',
      '/project/fruits/strawberry.js',
      '/project/fruits/tomato.js',
    ].join('\n');
  });

  it('crawls for files based on patterns', () => {
    process.platform = 'linux';

    childProcess = require('child_process');
    nodeCrawl = require('../node');

    mockResponse = [
      '/project/fruits/pear.js',
      '/project/fruits/strawberry.js',
      '/project/fruits/tomato.js',
      '/project/vegetables/melon.json',
    ].join('\n');

    const promise = nodeCrawl({
      data: {
        files: new Map(),
      },
      extensions: ['js', 'json'],
      ignore: pearMatcher,
      rootDir,
      roots: ['/project/fruits', '/project/vegtables'],
    }).then(data => {
      expect(childProcess.spawn).lastCalledWith('find', [
        '/project/fruits',
        '/project/vegtables',
        '-type',
        'f',
        '(',
        '-iname',
        '*.js',
        '-o',
        '-iname',
        '*.json',
        ')',
      ]);

      expect(data.files).not.toBe(null);

      expect(data.files).toEqual(
        createMap({
          'fruits/strawberry.js': ['', 32, 42, 0, [], null],
          'fruits/tomato.js': ['', 33, 42, 0, [], null],
          'vegetables/melon.json': ['', 34, 42, 0, [], null],
        }),
      );
    });

    return promise;
  });

  it('updates only changed files', () => {
    process.platform = 'linux';

    nodeCrawl = require('../node');

    // In this test sample, strawberry is changed and tomato is unchanged
    const tomato = ['', 33, 42, 1, [], null];
    const files = createMap({
      'fruits/strawberry.js': ['', 30, 40, 1, [], null],
      'fruits/tomato.js': tomato,
    });

    return nodeCrawl({
      data: {files},
      extensions: ['js'],
      ignore: pearMatcher,
      rootDir,
      roots: ['/project/fruits'],
    }).then(data => {
      expect(data.files).toEqual(
        createMap({
          'fruits/strawberry.js': ['', 32, 42, 0, [], null],
          'fruits/tomato.js': tomato,
        }),
      );

      // Make sure it is the *same* unchanged object.
      expect(data.files.get('fruits/tomato.js')).toBe(tomato);
    });
  });

  it('uses node fs APIs on windows', () => {
    process.platform = 'win32';

    nodeCrawl = require('../node');

    return nodeCrawl({
      data: {
        files: new Map(),
      },
      extensions: ['js'],
      ignore: pearMatcher,
      rootDir,
      roots: ['/project/fruits'],
    }).then(data => {
      expect(data.files).toEqual(
        createMap({
          'fruits/directory/strawberry.js': ['', 33, 42, 0, [], null],
          'fruits/tomato.js': ['', 32, 42, 0, [], null],
        }),
      );
    });
  });

  it('uses node fs APIs if "forceNodeFilesystemAPI" is set to true, regardless of platform', () => {
    process.platform = 'linux';

    nodeCrawl = require('../node');

    const files = new Map();
    return nodeCrawl({
      data: {files},
      extensions: ['js'],
      forceNodeFilesystemAPI: true,
      ignore: pearMatcher,
      rootDir,
      roots: ['/project/fruits'],
    }).then(data => {
      expect(data.files).toEqual(
        createMap({
          'fruits/directory/strawberry.js': ['', 33, 42, 0, [], null],
          'fruits/tomato.js': ['', 32, 42, 0, [], null],
        }),
      );
    });
  });

  it('completes with empty roots', () => {
    process.platform = 'win32';

    nodeCrawl = require('../node');

    const files = new Map();
    return nodeCrawl({
      data: {files},
      extensions: ['js'],
      forceNodeFilesystemAPI: true,
      ignore: pearMatcher,
      rootDir,
      roots: [],
    }).then(data => {
      expect(data.files).toEqual(new Map());
    });
  });

  it('completes with fs.readdir throwing an error', () => {
    process.platform = 'win32';

    nodeCrawl = require('../node');

    const files = new Map();
    return nodeCrawl({
      data: {files},
      extensions: ['js'],
      ignore: pearMatcher,
      rootDir,
      roots: ['/error'],
    }).then(data => {
      expect(data.files).toEqual(new Map());
    });
  });
});
