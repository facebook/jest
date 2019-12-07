/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {EOL} from 'os';
import detectNewline = require('detect-newline');

type Pragmas = Record<string, string | Array<string>>;

const commentEndRe = /\*\/$/;
const commentStartRe = /^\/\*\*/;
const docblockRe = /^\s*(\/\*\*?(.|\r?\n)*?\*\/)/m;
const lineCommentRe = /(^|\s+)\/\/([^\r\n]*)/g;
const ltrimNewlineRe = /^(\r?\n)+/;
const multilineRe = /(?:^|\r?\n) *(@[^\r\n]*?) *\r?\n *(?![^@\r\n]*\/\/[^]*)([^@\r\n\s][^@\r\n]+?) *\r?\n/g;
const propertyRe = /(?:^|\r?\n) *@(\S+) *([^\r\n]*)/g;
const stringStartRe = /(\r?\n|^) *\* ?/g;

export function extract(contents: string): string {
  const match = contents.match(docblockRe);
  return match ? match[0].trimLeft() : '';
}

// strip returns contents without docblock
export function strip(contents: string) {
  const match = contents.match(docblockRe);

  if (!match) {
    return contents;
  }

  if (!match[0]) {
    return contents;
  }

  return contents.replace(match[0], '');
}

export function parse(docblock: string): Pragmas {
  return parseWithComments(docblock).pragmas;
}

export function parseWithComments(
  docblock: string,
): {comments: string; pragmas: Pragmas} {
  const line = detectNewline(docblock) || EOL;

  docblock = docblock
    .replace(commentStartRe, '')
    .replace(commentEndRe, '')
    .replace(stringStartRe, '$1');

  // Normalize multi-line directives
  let prev = '';
  while (prev !== docblock) {
    prev = docblock;
    docblock = docblock.replace(multilineRe, `${line}$1 $2${line}`);
  }
  docblock = docblock.replace(ltrimNewlineRe, '').trimRight();

  const result = Object.create(null);
  const comments = docblock
    .replace(propertyRe, '')
    .replace(ltrimNewlineRe, '')
    .trimRight();

  let match;
  while ((match = propertyRe.exec(docblock))) {
    // strip linecomments from pragmas
    const nextPragma = match[2].replace(lineCommentRe, '');
    if (
      typeof result[match[1]] === 'string' ||
      Array.isArray(result[match[1]])
    ) {
      result[match[1]] = ([] as Array<string>).concat(
        result[match[1]],
        nextPragma,
      );
    } else {
      result[match[1]] = nextPragma;
    }
  }
  return {comments, pragmas: result};
}

export function print({
  comments = '',
  pragmas = {},
}: {
  comments?: string;
  pragmas?: Pragmas;
}): string {
  const line = detectNewline(comments) || EOL;
  const head = '/**';
  const start = ' *';
  const tail = ' */';

  const keys = Object.keys(pragmas);

  const printedObject = keys
    .map(key => printKeyValues(key, pragmas[key]))
    .reduce((arr, next) => arr.concat(next), [])
    .map(keyValue => start + ' ' + keyValue + line)
    .join('');

  if (!comments) {
    if (keys.length === 0) {
      return '';
    }
    if (keys.length === 1 && !Array.isArray(pragmas[keys[0]])) {
      const value = pragmas[keys[0]];
      return `${head} ${printKeyValues(keys[0], value)[0]}${tail}`;
    }
  }

  const printedComments =
    comments
      .split(line)
      .map(textLine => `${start} ${textLine}`)
      .join(line) + line;

  return (
    head +
    line +
    (comments ? printedComments : '') +
    (comments && keys.length ? start + line : '') +
    printedObject +
    tail
  );
}

function printKeyValues(key: string, valueOrArray: string | Array<string>) {
  return ([] as Array<string>)
    .concat(valueOrArray)
    .map(value => `@${key} ${value}`.trim());
}
