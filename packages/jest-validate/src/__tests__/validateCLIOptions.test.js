/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import validateCLIOptions from '../validateCLIOptions';

test('validates yargs special options', () => {
  const options = ['$0', '_', 'help', 'h'];
  const argv = {
    $0: true,
    _: true,
    h: false,
    help: false,
  };
  expect(validateCLIOptions(argv, options)).toBe(true);
});

test('fails for unknown option', () => {
  const options = ['$0', '_', 'help', 'h'];
  const argv = {
    $0: true,
    unknown: 'unknown',
  };
  expect(() =>
    validateCLIOptions(argv, options),
  ).toThrowErrorMatchingSnapshot();
});

test('fails for multiple unknown options', () => {
  const options = ['$0', '_', 'help', 'h'];
  const argv = {
    $0: true,
    jest: 'cool',
    test: 'unknown',
  };
  expect(() =>
    validateCLIOptions(argv, options),
  ).toThrowErrorMatchingSnapshot();
});

test('does not show suggestion when unrecognized cli param length <= 1', () => {
  const options = ['$0', '_', 'help', 'h'];
  const argv = {
    $0: true,
    l: true,
  };
  expect(() =>
    validateCLIOptions(argv, options),
  ).toThrowErrorMatchingSnapshot();
});

test('shows suggestion when unrecognized cli param length > 1', () => {
  const options = ['$0', '_', 'help', 'h'];
  const argv = {
    $0: true,
    hell: true,
  };
  expect(() =>
    validateCLIOptions(argv, options),
  ).toThrowErrorMatchingSnapshot();
});
