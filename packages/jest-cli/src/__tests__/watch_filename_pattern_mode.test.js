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
      constructor(context) {
        this._context = context;
      }

      findMatchingTests(pattern) {
        const paths = [
          './path/to/file1-test.js',
          './path/to/file2-test.js',
          './path/to/file3-test.js',
          './path/to/file4-test.js',
          './path/to/file5-test.js',
          './path/to/file6-test.js',
          './path/to/file7-test.js',
          './path/to/file8-test.js',
          './path/to/file9-test.js',
          './path/to/file10-test.js',
          './path/to/file11-test.js',
        ].filter(path => path.match(pattern));

        return {
          tests: paths.map(path => ({
            context: this._context,
            duration: null,
            path,
          })),
        };
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
      onComplete({snapshot: {}});

      return Promise.resolve();
    },
);

const watch = require('../watch').default;

const nextTick = () => new Promise(res => process.nextTick(res));

const globalConfig = {watch: true};

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

  it('Pressing "P" enters pattern mode', () => {
    contexts[0].config = {rootDir: ''};
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);

    // Write a enter pattern mode
    stdin.emit('p');
    expect(pipe.write).toBeCalledWith(' pattern › ');

    const assertPattern = hex => {
      pipe.write.mockReset();
      stdin.emit(hex);
      expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    };

    // Write a pattern
    ['p', '.', '*', '1', '0'].forEach(assertPattern);

    [KEYS.BACKSPACE, KEYS.BACKSPACE].forEach(assertPattern);

    ['3'].forEach(assertPattern);

    // Runs Jest again
    runJestMock.mockReset();
    stdin.emit(KEYS.ENTER);
    expect(runJestMock).toBeCalled();

    // globalConfig is updated with the current pattern
    expect(runJestMock.mock.calls[0][0].globalConfig).toMatchSnapshot();
  });
  it('Pressing "P" enters pattern mode (invalid regexp)', () => {
    contexts[0].config = {rootDir: ''};
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);

    // Write a enter pattern mode
    stdin.emit('p');
    expect(pipe.write).toBeCalledWith(' pattern › ');

    const assertPattern = hex => {
      pipe.write.mockReset();
      stdin.emit(hex);
      expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    };

    // Write a pattern
    ['*'].forEach(assertPattern);
    runJestMock.mockReset();
    stdin.emit(KEYS.ENTER);
    expect(runJestMock).not.toBeCalled();
  });

  it('Pressing "c" clears the filters', async () => {
    contexts[0].config = {rootDir: ''};
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);

    stdin.emit('p');
    await nextTick();

    ['p', '.', '*', '1', '0']

      .concat(KEYS.ENTER)
      .forEach(key => stdin.emit(key));

    stdin.emit('t');
    await nextTick();

    ['t', 'e', 's', 't'].concat(KEYS.ENTER).forEach(key => stdin.emit(key));

    await nextTick();

    stdin.emit('c');
    await nextTick();

    pipe.write.mockReset();
    stdin.emit('p');
    await nextTick();

    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
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
