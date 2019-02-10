/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ansiStyle from 'ansi-styles';

import prettyFormat from '../';

const {ConvertAnsi} = prettyFormat.plugins;

const prettyFormatResult = (val: string) =>
  prettyFormat(val, {
    plugins: [ConvertAnsi],
  });

describe('ConvertAnsi plugin', () => {
  it('supports style.red', () => {
    expect(
      prettyFormatResult(
        `${ansiStyle.red.open} foo content ${ansiStyle.red.close}`,
      ),
    ).toEqual('"<red> foo content </>"');
  });

  it('supports style.green', () => {
    expect(
      prettyFormatResult(
        `${ansiStyle.green.open} foo content ${ansiStyle.green.close}`,
      ),
    ).toEqual('"<green> foo content </>"');
  });

  it('supports style.reset', () => {
    expect(
      prettyFormatResult(
        `${ansiStyle.reset.open} foo content ${ansiStyle.reset.close}`,
      ),
    ).toEqual('"</> foo content </>"');
  });

  it('supports style.bold', () => {
    expect(prettyFormatResult(`${ansiStyle.bold.open} foo content`)).toEqual(
      '"<bold> foo content"',
    );
  });

  it('supports style.dim', () => {
    expect(prettyFormatResult(`${ansiStyle.dim.open} foo content`)).toEqual(
      '"<dim> foo content"',
    );
  });

  it('does not support other colors', () => {
    expect(prettyFormatResult(`${ansiStyle.blue.open}`)).toEqual('""');
  });
});
