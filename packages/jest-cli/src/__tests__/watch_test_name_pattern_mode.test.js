/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import chalk from 'chalk';
import {KEYS} from 'jest-watcher';

const runJestMock = jest.fn();

jest
  .mock('ansi-escapes', () => ({
    cursorDown: (count = 1) => `[MOCK - cursorDown(${count})]`,
    cursorHide: '[MOCK - cursorHide]',
    cursorRestorePosition: '[MOCK - cursorRestorePosition]',
    cursorSavePosition: '[MOCK - cursorSavePosition]',
    cursorShow: '[MOCK - cursorShow]',
    cursorTo: (x, y) => `[MOCK - cursorTo(${x}, ${y})]`,
  }))
  .mock('jest-util', () => {
    const {specialChars, ...util} = jest.requireActual('jest-util');
    return {
      ...util,
      specialChars: {...specialChars, CLEAR: '[MOCK - clear]'},
    };
  });

jest.mock(
  '../SearchSource',
  () =>
    class {
      findMatchingTests(pattern) {
        return {paths: []};
      }
    },
);

jest.doMock('chalk', () => new chalk.constructor({enabled: false}));

jest.doMock('strip-ansi');
require('strip-ansi').mockImplementation(str => str);

jest.doMock(
  '../runJest',
  () =>
    function() {
      const args = Array.from(arguments);
      const [{onComplete}] = args;
      runJestMock.apply(null, args);

      // Call the callback
      onComplete({
        snapshot: {},
        testResults: [
          {
            testResults: [{title: 'should return the correct index when'}],
          },
          {
            testResults: [{title: 'should allow test siblings to modify'}],
          },
          {
            testResults: [{title: 'might get confusing'}],
          },
          {
            testResults: [
              {title: 'should handle length properties that cannot'},
            ],
          },
          {
            testResults: [{title: 'should recognize various types'}],
          },
          {
            testResults: [{title: 'should recognize null and undefined'}],
          },
          {
            testResults: [{title: 'should not output colors to pipe'}],
          },
          {
            testResults: [{title: 'should convert string to a RegExp'}],
          },
          {
            testResults: [
              {title: 'should escape and convert string to a RegExp'},
            ],
          },
          {
            testResults: [{title: 'should convert grep string to a RegExp'}],
          },
        ],
      });

      return Promise.resolve();
    },
);

const watch = require('../watch').default;

const globalConfig = {
  watch: true,
};

afterEach(runJestMock.mockReset);

describe('Watch mode flows', () => {
  let pipe;
  let hasteMapInstances;
  let contexts;
  let stdin;

  beforeEach(() => {
    pipe = {write: jest.fn()};
    hasteMapInstances = [{on: () => {}}];
    contexts = [{config: {}}];
    stdin = new MockStdin();
  });

  it('Pressing "T" enters pattern mode', () => {
    contexts[0].config = {rootDir: ''};
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);

    // Write a enter pattern mode
    stdin.emit('t');
    expect(pipe.write).toBeCalledWith(' pattern › ');

    const assertPattern = hex => {
      pipe.write.mockReset();
      stdin.emit(hex);
      expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    };

    // Write a pattern
    ['c', 'o', 'n', ' ', '1', '2'].forEach(assertPattern);

    [KEYS.BACKSPACE, KEYS.BACKSPACE].forEach(assertPattern);

    ['*'].forEach(assertPattern);

    // Runs Jest again
    runJestMock.mockReset();
    stdin.emit(KEYS.ENTER);
    expect(runJestMock).toBeCalled();

    // globalConfig is updated with the current pattern
    expect(runJestMock.mock.calls[0][0].globalConfig).toMatchObject({
      onlyChanged: false,
      testNamePattern: 'con *',
      watch: true,
      watchAll: false,
    });
  });
});

class MockStdin {
  constructor() {
    this._callbacks = [];
  }

  setRawMode() {}

  resume() {}

  setEncoding() {}

  on(evt, callback) {
    this._callbacks.push(callback);
  }

  emit(key) {
    this._callbacks.forEach(cb => cb(key));
  }
}
