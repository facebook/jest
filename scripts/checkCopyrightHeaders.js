/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fs = require('fs');
const {execSync} = require('child_process');
const isbinaryfile = require('isbinaryfile');

const getFileContents = path => fs.readFileSync(path, {encoding: 'utf-8'});
const isDirectory = path => fs.lstatSync(path).isDirectory();
const createRegExp = pattern => new RegExp(pattern);

// Important: this patterns must be in sync with internal Facebook tools

const GENERIC_IGNORED_EXTENSIONS = [
  'lock',
  'patch',
  'exe',
  'bin',
  'cfg',
  'config',
  'conf',
  'html',
  'md',
  'markdown',
  'opam',
  'osm',
  'descr',
  'rst',
  'json',
  'key',
  'ini',
  'plist',
  'snap',
  'svg',
  'txt',
  'xcodeproj',
  'xcscheme',
  'xml',
  'yaml',
  'yml',
  'textile',
  'tsv',
  'csv',
  'pem',
  'csr',
  'der',
  'crt',
  'cert',
  'cer',
  'p7b',
  'iml',
  'org',
  'podspec',
  'modulemap',
  'pch',
  'lproj',
  'xcworkspace',
  'storyboard',
  'tvml',
  'xib',
  'pbxproj',
  'xcworkspacedata',
  'xccheckout',
  'xcsettings',
  'strings',
  'ipynb',
  'htm',
  'toml',
].map(extension => createRegExp(`\.${extension}$`));

const GENERIC_IGNORED_PATTERNS = [
  '(^|/)\\.[^/]+(/|$)',

  'third[_\\-. ]party/',
  '^node[_\\-. ]modules/',
  'gradlew\\.bat$',
  'gradlew$',
  'gradle/wrapper/',
  '.idea/',
  '__init__\\.py$',
  '^Setup.hs$',
  '^(readme|README|Readme)\\..*$',
  'Cargo\\.toml$',
  '^Cartfile.*$',
  '^.*\\.xcodeproj/$',
  '^.*\\.xcworkspace/$',
  '^.*\\.lproj/$',
  '^.*\\.bundle/$',
  '^MANIFEST\\.in$',
].map(createRegExp);

const CUSTOM_IGNORED_PATTERNS = [
  '\\.(example|map)$',
  '^examples/.*',
  '^flow-typed/.*',
  '^packages/expect/src/jasmineUtils\\.js$',
  '^packages/jest-config/src/vendor/jsonlint\\.js$',
].map(createRegExp);

const IGNORED_PATTERNS = [
  ...GENERIC_IGNORED_EXTENSIONS,
  ...GENERIC_IGNORED_PATTERNS,
  ...CUSTOM_IGNORED_PATTERNS,
];

const INCLUDED_PATTERNS = [
  // Any file with an extension
  /\.[^/]+$/,
];

const COPYRIGHT_HEADER =
  'Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.';

function needsCopyrightHeader(file) {
  const contents = getFileContents(file);
  return contents.trim().length > 0 && !contents.includes(COPYRIGHT_HEADER);
}

function check() {
  const allFiles = execSync('git ls-files', {encoding: 'utf-8'})
    .trim()
    .split('\n');

  const invalidFiles = allFiles.filter(
    file =>
      INCLUDED_PATTERNS.some(pattern => pattern.test(file)) &&
      !IGNORED_PATTERNS.some(pattern => pattern.test(file)) &&
      !isDirectory(file) &&
      !isbinaryfile.sync(file) &&
      needsCopyrightHeader(file)
  );

  if (invalidFiles.length > 0) {
    console.log(`Facebook copyright header check failed for the following files:

  ${invalidFiles.join('\n  ')}

Please include the header or blacklist the files in \`scripts/checkCopyrightHeaders.js\``);
    process.exit(1);
  }
}

check();
