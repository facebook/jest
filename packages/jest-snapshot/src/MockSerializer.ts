/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {NewPlugin} from 'pretty-format';

export const serialize: NewPlugin['serialize'] = (
  val,
  config,
  indentation,
  depth,
  refs,
  printer,
): string => {
  // Serialize a non-default name, even if config.printFunctionName is false.
  const name = val.getMockName();
  const nameString = name === 'jest.fn()' ? '' : ' ' + name;

  let callsString = '';
  if (val.mock.calls.length !== 0) {
    const indentationNext = indentation + config.indent;
    callsString =
      ' {' +
      config.spacingOuter +
      indentationNext +
      '"calls": ' +
      printer(val.mock.calls, config, indentationNext, depth, refs) +
      (config.min ? ', ' : ',') +
      config.spacingOuter +
      indentationNext +
      '"results": ' +
      printer(val.mock.results, config, indentationNext, depth, refs) +
      (config.min ? '' : ',') +
      config.spacingOuter +
      indentation +
      '}';
  }

  return '[MockFunction' + nameString + ']' + callsString;
};

export const test: NewPlugin['test'] = val => val && !!val._isMockFunction;

const plugin: NewPlugin = {serialize, test};

export default plugin;
