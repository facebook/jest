/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';
import BufferedConsole from '../BufferedConsole';

describe('CustomConsole', () => {
  let _console: BufferedConsole;
  const stdout = () =>
    _console
      .getBuffer()
      .map(log => log.message)
      .join('\n');

  beforeEach(() => {
    _console = new BufferedConsole(() => null);
  });

  describe('assert', () => {
    test('do not log when the assertion is truthy', () => {
      _console.assert(true);

      expect(stdout()).toMatch('');
    });

    test('do not log when the assertion is truthy and there is a message', () => {
      _console.assert(true, 'ok');

      expect(stdout()).toMatch('');
    });

    test('log the assertion error when the assertion is falsy', () => {
      _console.assert(false);

      expect(stdout()).toMatch('AssertionError');
      expect(stdout()).toMatch('false == true');
    });

    test('log the assertion error when the assertion is falsy with another message argument', () => {
      _console.assert(false, 'ok');

      expect(stdout()).toMatch('AssertionError');
      expect(stdout()).toMatch('ok');
    });
  });

  describe('count', () => {
    test('count using the default counter', () => {
      _console.count();
      _console.count();
      _console.count();

      expect(stdout()).toEqual('default: 1\ndefault: 2\ndefault: 3');
    });

    test('count using the a labeled counter', () => {
      _console.count('custom');
      _console.count('custom');
      _console.count('custom');

      expect(stdout()).toEqual('custom: 1\ncustom: 2\ncustom: 3');
    });

    test('countReset restarts default counter', () => {
      _console.count();
      _console.count();
      _console.countReset();
      _console.count();
      expect(stdout()).toEqual('default: 1\ndefault: 2\ndefault: 1');
    });

    test('countReset restarts custom counter', () => {
      _console.count('custom');
      _console.count('custom');
      _console.countReset('custom');
      _console.count('custom');

      expect(stdout()).toEqual('custom: 1\ncustom: 2\ncustom: 1');
    });
  });

  describe('group', () => {
    test('group without label', () => {
      _console.group();
      _console.log('hey');
      _console.group();
      _console.log('there');

      expect(stdout()).toEqual('  hey\n    there');
    });

    test('group with label', () => {
      _console.group('first');
      _console.log('hey');
      _console.group('second');
      _console.log('there');

      expect(stdout()).toEqual(`  ${chalk.bold('first')}
  hey
    ${chalk.bold('second')}
    there`);
    });

    test('groupEnd remove the indentation of the current group', () => {
      _console.group();
      _console.log('hey');
      _console.groupEnd();
      _console.log('there');

      expect(stdout()).toEqual('  hey\nthere');
    });

    test('groupEnd can not remove the indentation below the starting point', () => {
      _console.groupEnd();
      _console.groupEnd();
      _console.group();
      _console.log('hey');
      _console.groupEnd();
      _console.log('there');

      expect(stdout()).toEqual('  hey\nthere');
    });
  });

  describe('time', () => {
    test('should return the time between time() and timeEnd() on default timer', () => {
      _console.time();
      _console.timeEnd();

      expect(stdout()).toMatch('default: ');
      expect(stdout()).toMatch('ms');
    });

    test('should return the time between time() and timeEnd() on custom timer', () => {
      _console.time('custom');
      _console.timeEnd('custom');

      expect(stdout()).toMatch('custom: ');
      expect(stdout()).toMatch('ms');
    });
  });
});
