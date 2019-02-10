/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {defaults, descriptions} from 'jest-config';

const stringifyOption = (
  option: string,
  map: Object,
  linePrefix: string = '',
): string => {
  const optionDescription = `  // ${descriptions[option]}`;
  const stringifiedObject = `${option}: ${JSON.stringify(
    map[option],
    null,
    2,
  )}`;

  return (
    optionDescription +
    '\n' +
    stringifiedObject
      .split('\n')
      .map(line => '  ' + linePrefix + line)
      .join('\n') +
    ',\n'
  );
};

const generateConfigFile = (results: {[string]: boolean}): string => {
  const {coverage, clearMocks, environment} = results;

  const overrides: Object = {};

  if (coverage) {
    Object.assign(overrides, {
      coverageDirectory: 'coverage',
    });
  }

  if (environment === 'node') {
    Object.assign(overrides, {
      testEnvironment: 'node',
    });
  }

  if (clearMocks) {
    Object.assign(overrides, {
      clearMocks: true,
    });
  }

  const overrideKeys: Array<string> = Object.keys(overrides);

  const properties: Array<string> = [];

  for (const option in descriptions) {
    if (overrideKeys.includes(option)) {
      properties.push(stringifyOption(option, overrides));
    } else {
      properties.push(stringifyOption(option, defaults, '// '));
    }
  }

  return (
    '// For a detailed explanation regarding each configuration property, visit:\n' +
    '// https://jestjs.io/docs/en/configuration.html\n\n' +
    'module.exports = {\n' +
    properties.join('\n') +
    '};\n'
  );
};

export default generateConfigFile;
