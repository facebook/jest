/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import path from 'path';

export const escapePathForRegex = (dir: string) => {
  if (path.sep === '\\') {
    // Replace "\" with "/" so it's not escaped by escapeStrForRegex.
    // replacePathSepForRegex will convert it back.
    dir = dir.replace(/\\/g, '/');
  }
  return replacePathSepForRegex(escapeStrForRegex(dir));
};

export const escapeStrForRegex = (string: string) =>
  string.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');

export const replacePathSepForRegex = (string: string) => {
  if (path.sep === '\\') {
    return string.replace(
      /(\/|(.)?\\(?![[\]{}()*+?.^$|\\]))/g,
      (_match, _, p2) => (p2 && p2 !== '\\' ? p2 + '\\\\' : '\\\\'),
    );
  }
  return string;
};
