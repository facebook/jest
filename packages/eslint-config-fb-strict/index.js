/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Can't be ESModules as this is not compiled
const fbjsConfig = require('eslint-config-fbjs');

const variableNamePattern = String.raw`\s*[a-zA-Z_$][a-zA-Z_$\d]*\s*`;
const importPattern =
  String.raw`^(?:var|let|const|import type)\s+` +
  '{?' +
  variableNamePattern +
  '(?:,' +
  variableNamePattern +
  ')*}?' +
  String.raw`\s*(?:=\s*require\(|from)[a-zA-Z_+./''\s\d\-]+\)?[^;\n]*[;\n]`;
const maxLenIgnorePattern = String.raw`(^\s*(it|test)\(|${importPattern})`;

delete fbjsConfig.rules['babel/flow-object-type'];

module.exports = Object.assign({}, fbjsConfig, {
  env: {
    es6: true,
    'jest/globals': true,
    node: true,
  },
  plugins: fbjsConfig.plugins.concat(['jest']),
  rules: Object.assign({}, fbjsConfig.rules, {
    'array-bracket-spacing': [2, 'never'],
    'arrow-parens': [2, 'as-needed'],
    'arrow-spacing': [2],
    'brace-style': [
      2,
      '1tbs',
      {
        allowSingleLine: true,
      },
    ],
    'comma-dangle': [2, 'always-multiline'],
    'comma-spacing': [2],
    'comma-style': [2, 'last'],
    'computed-property-spacing': [2, 'never'],
    'eol-last': [2],
    'flowtype/object-type-delimiter': [2, 'comma'],
    indent: [0],
    'jest/no-focused-tests': [2],
    'jest/no-identical-title': [2],
    'jest/valid-expect': [2],
    'max-len': [
      2,
      {
        code: 80,
        ignorePattern: maxLenIgnorePattern,
        ignoreUrls: true,
      },
    ],
    'no-const-assign': [2],
    'no-extra-parens': [2, 'functions'],
    'no-irregular-whitespace': [2],
    'no-this-before-super': [2],
    'no-var': [2],
    'object-curly-spacing': [2, 'never'],
    'object-shorthand': [2],
    'prefer-arrow-callback': [2],
    'prefer-const': [2],
    quotes: [
      2,
      'single',
      {
        allowTemplateLiterals: true,
        avoidEscape: true,
      },
    ],
    semi: [2, 'always'],
    'sort-keys': [2],
    'space-before-blocks': [2],
    'space-before-function-paren': [
      2,
      {anonymous: 'never', asyncArrow: 'always', named: 'never'},
    ],
    'space-in-parens': [2, 'never'],
  }),
});
