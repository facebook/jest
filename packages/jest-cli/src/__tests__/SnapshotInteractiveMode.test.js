/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';
import {KEYS} from 'jest-watcher';
import SnapshotInteractiveMode from '../SnapshotInteractiveMode';

jest
  .mock('ansi-escapes', () => ({
    cursorRestorePosition: '[MOCK - cursorRestorePosition]',
    cursorSavePosition: '[MOCK - cursorSavePosition]',
    cursorScrollDown: '[MOCK - cursorScrollDown]',
    cursorTo: (x, y) => `[MOCK - cursorTo(${x}, ${y})]`,
    cursorUp: () => '[MOCK - cursorUp]',
    eraseDown: '[MOCK - eraseDown]',
  }))
  .mock('jest-util', () => {
    const {specialChars, ...util} = jest.requireActual('jest-util');
    return {
      ...util,
      specialChars: {...specialChars, CLEAR: '[MOCK - clear]'},
    };
  });

jest.doMock('chalk', () =>
  Object.assign(new chalk.constructor({enabled: false}), {
    stripColor: str => str,
  }),
);

describe('SnapshotInteractiveMode', () => {
  let pipe;
  let instance;
  let mockCallback;
  beforeEach(() => {
    pipe = {write: jest.fn()};
    instance = new SnapshotInteractiveMode(pipe);
    mockCallback = jest.fn(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
  });

  test('is inactive at construction', () => {
    expect(instance.isActive()).toBeFalsy();
  });

  test('call to run process the first file', () => {
    const assertions = [
      {fullName: 'test one', path: 'first.js'},
      {fullName: 'test two', path: 'second.js'},
    ];
    instance.run(assertions, mockCallback);
    expect(instance.isActive()).toBeTruthy();
    expect(mockCallback).toBeCalledWith(assertions[0], false);
  });

  test('call to abort', () => {
    const assertions = [
      {fullName: 'test one', path: 'first.js'},
      {fullName: 'test two', path: 'second.js'},
    ];
    instance.run(assertions, mockCallback);
    expect(instance.isActive()).toBeTruthy();
    instance.abort();
    expect(instance.isActive()).toBeFalsy();
    expect(instance.getSkippedNum()).toBe(0);
    expect(mockCallback).toBeCalledWith(null, false);
  });

  test('call to reset', () => {
    const assertions = [
      {fullName: 'test one', path: 'first.js'},
      {fullName: 'test two', path: 'second.js'},
    ];
    instance.run(assertions, mockCallback);
    expect(instance.isActive()).toBeTruthy();
    instance.restart();
    expect(instance.isActive()).toBeTruthy();
    expect(instance.getSkippedNum()).toBe(0);
    expect(mockCallback).toBeCalledWith(assertions[0], false);
  });

  test('press Q or ESC triggers an abort', () => {
    instance.abort = jest.fn();
    instance.put('q');
    instance.put(KEYS.ESCAPE);
    expect(instance.abort).toHaveBeenCalledTimes(2);
  });

  test('press ENTER trigger a run', () => {
    const assertions = [{fullName: 'test one', path: 'first.js'}];
    instance.run(assertions, mockCallback);
    instance.put(KEYS.ENTER);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith(assertions[0], false);
  });

  test('skip 1 test, then restart', () => {
    const assertions = [{fullName: 'test one', path: 'first.js'}];

    instance.run(assertions, mockCallback);
    expect(mockCallback).nthCalledWith(1, assertions[0], false);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('s');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('r');
    expect(instance.getSkippedNum()).toBe(0);
    expect(mockCallback).nthCalledWith(2, assertions[0], false);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
  });

  test('skip 1 test, then quit', () => {
    const assertions = [{fullName: 'test one', path: 'first.js'}];

    instance.run(assertions, mockCallback);
    expect(mockCallback).nthCalledWith(1, assertions[0], false);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('s');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('q');
    expect(instance.getSkippedNum()).toBe(0);
    expect(mockCallback).nthCalledWith(2, null, false);
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  test('update 1 test, then finish and return', () => {
    const mockCallback = jest.fn();
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: false}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });

    const assertions = [{fullName: 'test one', path: 'first.js'}];

    instance.run(assertions, mockCallback);
    expect(mockCallback).nthCalledWith(1, assertions[0], false);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('u');
    expect(mockCallback).nthCalledWith(2, assertions[0], true);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();

    instance.put(KEYS.ENTER);
    expect(instance.isActive()).toBe(false);
    expect(mockCallback).nthCalledWith(3, null, false);
  });

  test('skip 2 tests, then finish and restart', () => {
    const assertions = [
      {fullName: 'test one', path: 'first.js'},
      {fullName: 'test two', path: 'first.js'},
    ];
    instance.run(assertions, mockCallback);
    expect(mockCallback).nthCalledWith(1, assertions[0], false);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('s');
    expect(mockCallback).nthCalledWith(2, assertions[1], false);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('s');
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('r');
    expect(instance.getSkippedNum()).toBe(0);
    expect(mockCallback).nthCalledWith(3, assertions[0], false);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
  });

  test('update 2 tests, then finish and return', () => {
    const mockCallback = jest.fn();
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: false}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: false}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });

    const assertions = [
      {fullName: 'test one', path: 'first.js'},
      {fullName: 'test two', path: 'first.js'},
    ];

    instance.run(assertions, mockCallback);
    expect(mockCallback).nthCalledWith(1, assertions[0], false);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('u');
    expect(mockCallback).nthCalledWith(2, assertions[0], true);
    expect(mockCallback).nthCalledWith(3, assertions[1], false);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('u');
    expect(mockCallback).nthCalledWith(4, assertions[1], true);
    expect(mockCallback).toHaveBeenCalledTimes(4);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put(KEYS.ENTER);
    expect(instance.isActive()).toBe(false);
    expect(mockCallback).nthCalledWith(5, null, false);
    expect(mockCallback).toHaveBeenCalledTimes(5);
  });

  test('update 1 test, skip 1 test, then finish and restart', () => {
    const mockCallback = jest.fn();
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: false}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });

    const assertions = [
      {fullName: 'test one', path: 'first.js'},
      {fullName: 'test two', path: 'first.js'},
    ];

    instance.run(assertions, mockCallback);
    expect(mockCallback).nthCalledWith(1, assertions[0], false);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('u');
    expect(mockCallback).nthCalledWith(2, assertions[0], true);
    expect(mockCallback).nthCalledWith(3, assertions[1], false);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('s');
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('r');
    expect(instance.getSkippedNum()).toBe(0);
    expect(mockCallback).nthCalledWith(4, assertions[1], false);
    expect(mockCallback).toHaveBeenCalledTimes(4);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
  });

  test('skip 1 test, update 1 test, then finish and restart', () => {
    const mockCallback = jest.fn();
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: false}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });
    mockCallback.mockImplementationOnce(() => {
      instance.updateWithResults({snapshot: {failure: true}});
    });

    const assertions = [
      {fullName: 'test one', path: 'first.js'},
      {fullName: 'test two', path: 'first.js'},
    ];

    instance.run(assertions, mockCallback);
    expect(mockCallback).nthCalledWith(1, assertions[0], false);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('s');
    expect(mockCallback).nthCalledWith(2, assertions[1], false);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('u');
    expect(mockCallback).nthCalledWith(3, assertions[1], true);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
    pipe.write.mockClear();

    instance.put('r');
    expect(instance.getSkippedNum()).toBe(0);
    expect(mockCallback).nthCalledWith(4, assertions[0], false);
    expect(mockCallback).toHaveBeenCalledTimes(4);
    expect(pipe.write.mock.calls.join('\n')).toMatchSnapshot();
  });
});
