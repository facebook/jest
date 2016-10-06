/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

'use strict';

import type {Path} from 'types/Config';

const createDirectory = require('jest-util').createDirectory;
const fileExists = require('jest-file-exists');
const path = require('path');
const prettyFormat = require('pretty-format');
const ReactElementPlugin = require('pretty-format/plugins/ReactElement');
const fs = require('fs');
const naturalCompare = require('natural-compare');
const ReactTestComponentPlugin = require('pretty-format/plugins/ReactTestComponent');
const ReactTestComponentToHtmlPlugin = require('./ReactTestComponentToHtml');
const buildHtmlPreview = require('./buildHtmlPreview');

const PLUGINS = [ReactElementPlugin, ReactTestComponentPlugin];
const PLUGINS_HTML = [ReactTestComponentToHtmlPlugin];
const SNAPSHOT_EXTENSION = 'snap';

const testNameToKey = (testName: string, count: number) =>
  testName + ' ' + count;

const keyToTestName = (key: string) => {
  if (!/ \d+$/.test(key)) {
    throw new Error('Snapshot keys must end with a number.');
  }

  return key.replace(/ \d+$/, '');
};

const getSnapshotPath = (testPath: Path) => path.join(
  path.join(path.dirname(testPath), '__snapshots__'),
  path.basename(testPath) + '.' + SNAPSHOT_EXTENSION,
);

// The HTML preview will be saved alongside the snapshot file,
// just with .html extension
const getHtmlPreviewPath = (snapshotPath: Path): string => path.join(
  path.dirname(snapshotPath),
  path.basename(snapshotPath, '.' + SNAPSHOT_EXTENSION) + '.html',
);

const getSnapshotData = (snapshotPath: Path) => {
  const data = Object.create(null);

  if (fileExists(snapshotPath)) {
    try {
      delete require.cache[require.resolve(snapshotPath)];
      /* eslint-disable no-useless-call */
      Object.assign(data, require.call(null, snapshotPath));
      /* eslint-enable no-useless-call */
    } catch (e) {}
  }

  return data;
};

// Extra line breaks at the beginning and at the end of the snapshot are useful
// to make the content of the snapshot easier to read
const addExtraLineBreaks =
  string => string.includes('\n') ? `\n${string}\n` : string;

const serialize = (data: any): string => {
  return addExtraLineBreaks(prettyFormat(data, {
    plugins: PLUGINS,
    printFunctionName: false,
  }));
};

const escape = (string: string) => string.replace(/\`/g, '\\\`');
const unescape = (string: string) => string.replace(/\\(\"|\\|\')/g, '$1');

const getHtmlSnapshot = (data: any): string => {
  if (ReactTestComponentToHtmlPlugin.test(data)) {
    return prettyFormat(data, {plugins: PLUGINS_HTML});
  }
  return '<pre class="jest--nonreact">\n' + prettyFormat(data) + '\n</pre>';
};

const ensureDirectoryExists = (filePath: Path) => {
  try {
    createDirectory(path.join(path.dirname(filePath)));
  } catch (e) {}
};

const saveSnapshotFile = (
  snapshotData: {[key: string]: string},
  snapshotPath: Path,
) => {
  const snapshots = Object.keys(snapshotData).sort(naturalCompare)
    .map(key =>
      'exports[`' + escape(key) + '`] = `' +
      escape(snapshotData[key]) + '`;',
    );

  ensureDirectoryExists(snapshotPath);
  fs.writeFileSync(snapshotPath, snapshots.join('\n\n') + '\n');
};

const saveHtmlPreview = (
  htmlSnapshots: {[key: string]: string},
  htmlPreviewPath: Path,
) => {
  const htmlPreview = buildHtmlPreview(htmlSnapshots);
  ensureDirectoryExists(htmlPreviewPath);
  fs.writeFileSync(htmlPreviewPath, htmlPreview);
};

module.exports = {
  SNAPSHOT_EXTENSION,
  getSnapshotPath,
  getHtmlPreviewPath,
  getSnapshotData,
  testNameToKey,
  keyToTestName,
  serialize,
  getHtmlSnapshot,
  ensureDirectoryExists,
  saveSnapshotFile,
  saveHtmlPreview,
  escape,
  unescape,
};
