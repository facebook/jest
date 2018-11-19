/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const ifRegExpSupported = (value: string): string | boolean => {
  try {
    // eslint-disable-next-line no-new
    new RegExp(value);
    return value;
  } catch (e) {
    return false;
  }
};

// Negative look behind is only supported in Node 9+
const NOT_A_DOT = ifRegExpSupported('(?<!\\.\\s*)') || '(?:^|[^.]\\s*)';
const CAPTURE_STRING_LITERAL = pos => `([\`'"])([^'"\`]*?)(?:\\${pos})`;
const WORD_SEPARATOR = '\\b';
const LEFT_PARENTHESIS = '\\(';
const RIGHT_PARENTHESIS = '\\)';
const WHITESPACE = '\\s*';
const OPTIONAL_COMMA = '(:?,\\s*)?';

function createRegExp(parts, flags) {
  return new RegExp(parts.join(''), flags);
}

function alternatives(...parts) {
  return `(?:${parts.join('|')})`;
}

function functionCallStart(...names) {
  return [
    NOT_A_DOT,
    WORD_SEPARATOR,
    alternatives(...names),
    WHITESPACE,
    LEFT_PARENTHESIS,
    WHITESPACE,
  ];
}

const BLOCK_COMMENT_RE = /\/\*[^]*?\*\//g;
const LINE_COMMENT_RE = /\/\/.*/g;

const REQUIRE_OR_DYNAMIC_IMPORT_RE = createRegExp(
  [
    ...functionCallStart('require', 'import'),
    CAPTURE_STRING_LITERAL(1),
    WHITESPACE,
    OPTIONAL_COMMA,
    RIGHT_PARENTHESIS,
  ],
  'g',
);

const IMPORT_OR_EXPORT_RE = createRegExp(
  [
    '\\b(?:import|export)\\s+(?!type(?:of)?\\s+)[^\'"]+\\s+from\\s+',
    CAPTURE_STRING_LITERAL(1),
  ],
  'g',
);

const JEST_EXTENSIONS_RE = createRegExp(
  [
    ...functionCallStart(
      'require\\s*\\.\\s*(?:requireActual|requireMock)',
      'jest\\s*\\.\\s*(?:requireActual|requireMock|genMockFromModule)',
    ),
    CAPTURE_STRING_LITERAL(1),
    WHITESPACE,
    OPTIONAL_COMMA,
    RIGHT_PARENTHESIS,
  ],
  'g',
);

export function extract(code: string): Set<string> {
  const dependencies = new Set();

  const addDependency = (match: string, q: string, dep: string) => {
    dependencies.add(dep);
    return match;
  };

  code
    .replace(BLOCK_COMMENT_RE, '')
    .replace(LINE_COMMENT_RE, '')
    .replace(IMPORT_OR_EXPORT_RE, addDependency)
    .replace(REQUIRE_OR_DYNAMIC_IMPORT_RE, addDependency)
    .replace(JEST_EXTENSIONS_RE, addDependency);

  return dependencies;
}
