/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {InternalHasteMap} from 'types/HasteMap';
import type {CrawlerOptions} from '../types';

import * as fastPath from '../lib/fast_path';
import normalizePathSep from '../lib/normalizePathSep';
import path from 'path';
import watchman from 'fb-watchman';
import H from '../constants';

const watchmanURL =
  'https://facebook.github.io/watchman/docs/troubleshooting.html';

function WatchmanError(error: Error): Error {
  error.message =
    `Watchman error: ${error.message.trim()}. Make sure watchman ` +
    `is running for this project. See ${watchmanURL}.`;
  return error;
}

module.exports = async function watchmanCrawl(
  options: CrawlerOptions,
): Promise<InternalHasteMap> {
  const fields = ['name', 'exists', 'mtime_ms', 'size'];
  const {data, extensions, ignore, rootDir, roots} = options;
  const defaultWatchExpression = [
    'allof',
    ['type', 'f'],
    ['anyof'].concat(extensions.map(extension => ['suffix', extension])),
  ];
  const clocks = data.clocks;
  const client = new watchman.Client();

  let clientError;
  client.on('error', error => (clientError = WatchmanError(error)));

  const cmd = (...args) =>
    new Promise((resolve, reject) =>
      client.command(args, (error, result) =>
        error ? reject(WatchmanError(error)) : resolve(result),
      ),
    );

  if (options.computeSha1) {
    const {capabilities} = await cmd('list-capabilities');

    if (capabilities.indexOf('field-content.sha1hex') !== -1) {
      fields.push('content.sha1hex');
    }
  }

  async function getWatchmanRoots(roots) {
    const watchmanRoots = new Map();
    await Promise.all(
      roots.map(async root => {
        const response = await cmd('watch-project', root);
        const existing = watchmanRoots.get(response.watch);
        // A root can only be filtered if it was never seen with a
        // relative_path before.
        const canBeFiltered = !existing || existing.length > 0;

        if (canBeFiltered) {
          if (response.relative_path) {
            watchmanRoots.set(
              response.watch,
              (existing || []).concat(response.relative_path),
            );
          } else {
            // Make the filter directories an empty array to signal that this
            // root was already seen and needs to be watched for all files or
            // directories.
            watchmanRoots.set(response.watch, []);
          }
        }
      }),
    );
    return watchmanRoots;
  }

  async function queryWatchmanForDirs(rootProjectDirMappings) {
    const files = new Map();
    let isFresh = false;
    await Promise.all(
      Array.from(rootProjectDirMappings).map(
        async ([root, directoryFilters]) => {
          const expression = Array.from(defaultWatchExpression);
          const glob = [];

          if (directoryFilters.length > 0) {
            expression.push([
              'anyof',
              ...directoryFilters.map(dir => ['dirname', dir]),
            ]);

            for (const directory of directoryFilters) {
              for (const extension of extensions) {
                glob.push(`${directory}/**/*.${extension}`);
              }
            }
          } else {
            for (const extension of extensions) {
              glob.push(`**/*.${extension}`);
            }
          }

          const relativeRoot = fastPath.relative(rootDir, root);
          const query = clocks.has(relativeRoot)
            ? // Use the `since` generator if we have a clock available
              {expression, fields, since: clocks.get(relativeRoot)}
            : // Otherwise use the `glob` filter
              {expression, fields, glob};

          const response = await cmd('query', root, query);

          if ('warning' in response) {
            console.warn('watchman warning: ', response.warning);
          }

          isFresh = isFresh || response.is_fresh_instance;
          files.set(root, response);
        },
      ),
    );

    return {
      files,
      isFresh,
    };
  }

  let files = data.files;
  let watchmanFiles;
  try {
    const watchmanRoots = await getWatchmanRoots(roots);
    const watchmanFileResults = await queryWatchmanForDirs(watchmanRoots);

    // Reset the file map if watchman was restarted and sends us a list of
    // files.
    if (watchmanFileResults.isFresh) {
      files = new Map();
    }

    watchmanFiles = watchmanFileResults.files;
  } finally {
    client.end();
  }

  if (clientError) {
    throw clientError;
  }

  for (const [watchRoot, response] of watchmanFiles) {
    const fsRoot = normalizePathSep(watchRoot);
    const relativeFsRoot = fastPath.relative(rootDir, fsRoot);
    clocks.set(relativeFsRoot, response.clock);

    for (const fileData of response.files) {
      const filePath = fsRoot + path.sep + normalizePathSep(fileData.name);
      const relativeFilePath = fastPath.relative(rootDir, filePath);

      if (!fileData.exists) {
        files.delete(relativeFilePath);
      } else if (!ignore(filePath)) {
        const mtime =
          typeof fileData.mtime_ms === 'number'
            ? fileData.mtime_ms
            : fileData.mtime_ms.toNumber();
        const size = fileData.size;

        let sha1hex = fileData['content.sha1hex'];
        if (typeof sha1hex !== 'string' || sha1hex.length !== 40) {
          sha1hex = null;
        }

        const existingFileData = data.files.get(relativeFilePath);
        let nextData;

        if (existingFileData && existingFileData[H.MTIME] === mtime) {
          nextData = existingFileData;
        } else if (
          existingFileData &&
          sha1hex &&
          existingFileData[H.SHA1] === sha1hex
        ) {
          nextData = [...existingFileData];
          nextData[1] = mtime;
        } else {
          // See ../constants.js
          nextData = ['', mtime, size, 0, [], sha1hex];
        }

        const mappings = options.mapper ? options.mapper(filePath) : null;

        if (mappings) {
          for (const absoluteVirtualFilePath of mappings) {
            if (!ignore(absoluteVirtualFilePath)) {
              const relativeVirtualFilePath = fastPath.relative(
                rootDir,
                absoluteVirtualFilePath,
              );
              files.set(relativeVirtualFilePath, nextData);
            }
          }
        } else {
          files.set(relativeFilePath, nextData);
        }
      }
    }
  }

  data.files = files;
  return data;
};
