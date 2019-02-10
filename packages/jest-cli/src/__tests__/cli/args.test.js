/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import type {Argv} from 'types/Argv';
import {check} from '../../cli/args';
import {buildArgv} from '../../cli';

describe('check', () => {
  it('returns true if the arguments are valid', () => {
    const argv: Argv = {};
    expect(check(argv)).toBe(true);
  });

  it('raises an exception if runInBand and maxWorkers are both specified', () => {
    const argv: Argv = {maxWorkers: 2, runInBand: true};
    expect(() => check(argv)).toThrow(
      'Both --runInBand and --maxWorkers were specified',
    );
  });

  it('raises an exception if onlyChanged and watchAll are both specified', () => {
    const argv: Argv = {onlyChanged: true, watchAll: true};
    expect(() => check(argv)).toThrow(
      'Both --onlyChanged and --watchAll were specified',
    );
  });

  it('raises an exception when lastCommit and watchAll are both specified', () => {
    const argv: Argv = {lastCommit: true, watchAll: true};
    expect(() => check(argv)).toThrow(
      'Both --lastCommit and --watchAll were specified',
    );
  });

  it('raises an exception if findRelatedTests is specified with no file paths', () => {
    const argv: Argv = {_: [], findRelatedTests: true};
    expect(() => check(argv)).toThrow(
      'The --findRelatedTests option requires file paths to be specified',
    );
  });

  it('raises an exception if maxWorkers is specified with no number', () => {
    const argv: Argv = {maxWorkers: undefined};
    expect(() => check(argv)).toThrow(
      'The --maxWorkers (-w) option requires a number to be specified',
    );
  });

  it('raises an exception if config is not a valid JSON string', () => {
    const argv: Argv = {config: 'x:1'};
    expect(() => check(argv)).toThrow(
      'The --config option requires a JSON string literal, or a file path with a .js or .json extension',
    );
  });
});

describe('buildArgv', () => {
  it('should return only camelcased args ', () => {
    const mockProcessArgv = jest
      .spyOn(process.argv, 'slice')
      .mockImplementation(() => ['--clear-mocks']);
    const actual = buildArgv(null);
    expect(actual).not.toHaveProperty('clear-mocks');
    expect(actual).toHaveProperty('clearMocks', true);
    mockProcessArgv.mockRestore();
  });
});
