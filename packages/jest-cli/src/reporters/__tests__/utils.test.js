/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import path from 'path';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import {trimAndFormatPath, wrapAnsiString} from '../utils';

describe('wrapAnsiString()', () => {
  it('wraps a long string containing ansi chars', () => {
    const string =
      `abcde ${chalk.red.bold('red-bold')} 1234456` +
      `${chalk.dim('bcd')} ` +
      `123ttttttththththththththththththththththththththth` +
      `tetetetetettetetetetetetetete${chalk.underline.bold('stnhsnthsnth')}` +
      `ssot`;
    expect(wrapAnsiString(string, 10)).toMatchSnapshot();
    expect(stripAnsi(wrapAnsiString(string, 10))).toMatchSnapshot();
  });

  it('returns the string unaltered if given a terminal width of zero', () => {
    const string = `This string shouldn't cause you any trouble`;
    expect(wrapAnsiString(string, 0)).toMatchSnapshot();
    expect(stripAnsi(wrapAnsiString(string, 0))).toMatchSnapshot();
  });
});

describe('trimAndFormatPath()', () => {
  it('trims dirname', () => {
    const pad = 5;
    const basename = '1234.js';
    const dirname = '1234567890/1234567890';
    const columns = 25;
    const result = trimAndFormatPath(
      pad,
      {rootDir: ''},
      path.join(dirname, basename),
      columns,
    );

    expect(result).toMatchSnapshot();
    expect(stripAnsi(result).length).toBe(20);
  });

  it('trims dirname (longer line width)', () => {
    const pad = 5;
    const basename = '1234.js';
    const dirname = '1234567890/1234567890';
    const columns = 30;
    const result = trimAndFormatPath(
      pad,
      {rootDir: ''},
      path.join(dirname, basename),
      columns,
    );

    expect(result).toMatchSnapshot();
    expect(stripAnsi(result).length).toBe(25);
  });

  it('trims dirname and basename', () => {
    const pad = 5;
    const basename = '1234.js';
    const dirname = '1234567890/1234567890';
    const columns = 15;
    const result = trimAndFormatPath(
      pad,
      {rootDir: ''},
      path.join(dirname, basename),
      columns,
    );

    expect(result).toMatchSnapshot();
    expect(stripAnsi(result).length).toBe(10);
  });

  it('does not trim anything', () => {
    const pad = 5;
    const basename = '1234.js';
    const dirname = '1234567890/1234567890';
    const columns = 50;
    const totalLength = basename.length + path.sep.length + dirname.length;
    const result = trimAndFormatPath(
      pad,
      {rootDir: ''},
      path.join(dirname, basename),
      columns,
    );

    expect(result).toMatchSnapshot();
    expect(stripAnsi(result).length).toBe(totalLength);
  });

  test('split at the path.sep index', () => {
    const pad = 5;
    const basename = '1234.js';
    const dirname = '1234567890';
    const columns = 16;
    const result = trimAndFormatPath(
      pad,
      {rootDir: ''},
      path.join(dirname, basename),
      columns,
    );

    expect(result).toMatchSnapshot();
    expect(stripAnsi(result).length).toBe(columns - pad);
  });
});
