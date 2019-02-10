/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @flow
 */

import ansiStyles from 'ansi-styles';

const returnInput = str => str;

const allColorsAsFunc = Object.keys(ansiStyles)
  .map(style => ({[style]: returnInput}))
  .reduce((acc, cur) => Object.assign(acc, cur));

Object.keys(allColorsAsFunc)
  .map(color => allColorsAsFunc[color])
  .forEach(style => {
    Object.assign(style, allColorsAsFunc);
    Object.assign(returnInput, style);
  });

module.exports = allColorsAsFunc;
