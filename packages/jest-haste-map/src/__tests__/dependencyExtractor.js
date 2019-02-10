/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const blockCommentRe = /\/\*[^]*?\*\//g;
const lineCommentRe = /\/\/.*/g;
const LOAD_MODULE_RE = /(?:^|[^.]\s*)(\bloadModule\s*?\(\s*?)([`'"])([^`'"]+)(\2\s*?\))/g;

export function extract(code, filePath, defaultDependencyExtractor) {
  const dependencies = defaultDependencyExtractor(code);

  const addDependency = (match, pre, quot, dep, post) => {
    dependencies.add(dep);
    return match;
  };

  code
    .replace(blockCommentRe, '')
    .replace(lineCommentRe, '')
    .replace(LOAD_MODULE_RE, addDependency);

  return dependencies;
}

let cacheKey;

export function getCacheKey() {
  return cacheKey;
}

export function setCacheKey(key) {
  cacheKey = key;
}
