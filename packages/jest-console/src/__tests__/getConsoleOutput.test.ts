/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import BufferedConsole from '../BufferedConsole';
import getConsoleOutput from '../getConsoleOutput';
import {formatStackTrace} from 'jest-message-util';
import {LogType} from '../types';

jest.mock('jest-message-util', () => ({
  formatStackTrace: jest.fn(),
}));

describe('getConsoleOutput', () => {
  formatStackTrace.mockImplementation(() => 'throw new Error("Whoops!");');
  const cases = [
    'assert',
    'count',
    'debug',
    'dir',
    'dirxml',
    'error',
    'group',
    'groupCollapsed',
    'info',
    'log',
    'time',
    'warn',
  ];

  cases.forEach(logType => {
    it(`takes noStackTrace and pass it on for ${logType}`, () => {
      getConsoleOutput(
        'someRootPath',
        true,
        BufferedConsole.write([], logType as LogType, 'message', 4),
        {
          rootDir: 'root',
          testMatch: [],
        },
        true,
      );
      expect(formatStackTrace).toHaveBeenCalled();
      expect(formatStackTrace).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          noCodeFrame: expect.anything(),
          noStackTrace: true,
        }),
      );
    });
  });
});