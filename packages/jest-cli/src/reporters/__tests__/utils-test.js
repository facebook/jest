/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails oncall+jsinfra
 */

'use strict';

const {wrapAnsiString, trimAndFormatPath} = require('../utils');
const chalk = require('chalk');
const path = require('path');
const stripAnsi = require('strip-ansi');

describe('wrapAnsiString()', () => {
  it('wraps a long string containing ansi chars', () => {
    const string = `abcde ${chalk.red.bold('red-bold')} 1234456` +
     `${chalk.dim('bcd')} 123ttttttththththththththththththththththththththth` +
     `tetetetetettetetetetetetetete${chalk.underline.bold('stnhsnthsnth')}ssot`;
    expect(wrapAnsiString(string, 10)).toMatchSnapshot();
    expect(stripAnsi(wrapAnsiString(string, 10))).toMatchSnapshot();
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
