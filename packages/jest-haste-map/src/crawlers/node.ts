/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs';
import path from 'path';
import {spawn} from 'child_process';
import H from '../constants';
import * as fastPath from '../lib/fast_path';
import {IgnoreMatcher, InternalHasteMap, CrawlerOptions} from '../types';

type Result = Array<[/* id */ string, /* mtime */ number, /* size */ number]>;

type Callback = (result: Result) => void;

function find(
  roots: Array<string>,
  extensions: Array<string>,
  ignore: IgnoreMatcher,
  callback: Callback,
): void {
  const result: Result = [];
  let activeCalls = 0;

  function search(directory: string): void {
    activeCalls++;
    fs.readdir(directory, (err, names) => {
      activeCalls--;
      if (err) {
        callback(result);
        return;
      }
      names.forEach(file => {
        file = path.join(directory, file);
        if (ignore(file)) {
          return;
        }
        activeCalls++;

        fs.lstat(file, (err, stat) => {
          activeCalls--;

          if (!err && stat && !stat.isSymbolicLink()) {
            if (stat.isDirectory()) {
              search(file);
            } else {
              const ext = path.extname(file).substr(1);
              if (extensions.indexOf(ext) !== -1) {
                result.push([file, stat.mtime.getTime(), stat.size]);
              }
            }
          }
          if (activeCalls === 0) {
            callback(result);
          }
        });
      });

      if (activeCalls === 0) {
        callback(result);
      }
    });
  }

  if (roots.length > 0) {
    roots.forEach(search);
  } else {
    callback(result);
  }
}

function findNative(
  roots: Array<string>,
  extensions: Array<string>,
  ignore: IgnoreMatcher,
  callback: Callback,
): void {
  const args = Array.from(roots);
  args.push('-type', 'f');
  if (extensions.length) {
    args.push('(');
  }
  extensions.forEach((ext, index) => {
    if (index) {
      args.push('-o');
    }
    args.push('-iname');
    args.push('*.' + ext);
  });
  if (extensions.length) {
    args.push(')');
  }

  const child = spawn('find', args);
  let stdout = '';
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', data => (stdout += data));

  child.stdout.on('close', () => {
    const lines = stdout
      .trim()
      .split('\n')
      .filter(x => !ignore(x));
    const result: Result = [];
    let count = lines.length;
    if (!count) {
      callback([]);
    } else {
      lines.forEach(path => {
        fs.stat(path, (err, stat) => {
          if (!err && stat) {
            result.push([path, stat.mtime.getTime(), stat.size]);
          }
          if (--count === 0) {
            callback(result);
          }
        });
      });
    }
  });
}

export = function nodeCrawl(
  options: CrawlerOptions,
): Promise<InternalHasteMap> {
  if (options.mapper) {
    throw new Error(`Option 'mapper' isn't supported by the Node crawler`);
  }

  const {
    data,
    extensions,
    forceNodeFilesystemAPI,
    ignore,
    rootDir,
    roots,
  } = options;

  return new Promise(resolve => {
    const callback = (list: Result) => {
      const files = new Map();
      list.forEach(fileData => {
        const [filePath, mtime, size] = fileData;
        const relativeFilePath = fastPath.relative(rootDir, filePath);
        const existingFile = data.files.get(relativeFilePath);
        if (existingFile && existingFile[H.MTIME] === mtime) {
          files.set(relativeFilePath, existingFile);
        } else {
          // See ../constants.js; SHA-1 will always be null and fulfilled later.
          files.set(relativeFilePath, ['', mtime, size, 0, [], null]);
        }
      });
      data.files = files;
      data.links = new Map(); // TODO: support symlinks
      resolve(data);
    };

    if (forceNodeFilesystemAPI || process.platform === 'win32') {
      find(roots, extensions, ignore, callback);
    } else {
      findNative(roots, extensions, ignore, callback);
    }
  });
};
