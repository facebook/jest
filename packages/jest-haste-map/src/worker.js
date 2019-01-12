/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {HasteImpl, WorkerMessage, WorkerMetadata} from './types';

import * as babel from '@babel/core';
import crypto from 'crypto';
import path from 'path';
import fs from 'graceful-fs';
import blacklist from './blacklist';
import H from './constants';
import * as dependencyExtractor from './lib/dependencyExtractor';

const PACKAGE_JSON = path.sep + 'package.json';
const TYPESCRIPT_EXTENSION = '.ts';

let hasteImpl: ?HasteImpl = null;
let hasteImplModulePath: ?string = null;

function sha1hex(content: string | Buffer): string {
  return crypto
    .createHash('sha1')
    .update(content)
    .digest('hex');
}

export async function worker(data: WorkerMessage): Promise<WorkerMetadata> {
  if (
    data.hasteImplModulePath &&
    data.hasteImplModulePath !== hasteImplModulePath
  ) {
    if (hasteImpl) {
      throw new Error('jest-haste-map: hasteImplModulePath changed');
    }
    hasteImplModulePath = data.hasteImplModulePath;
    // $FlowFixMe: dynamic require
    hasteImpl = (require(hasteImplModulePath): HasteImpl);
  }

  let content;
  let dependencies;
  let id;
  let module;
  let sha1;

  const {computeDependencies, computeSha1, rootDir, filePath} = data;

  const getJSONContent = (): string => {
    if (content === undefined) {
      content = fs.readFileSync(filePath, 'utf8');
    }
    return content;
  };
  const getContent = (): string => {
    if (content === undefined) {
      if (filePath.endsWith(TYPESCRIPT_EXTENSION)) {
        try {
          const transformed = babel.transformFileSync(filePath, {
            cwd: __dirname,
            plugins: ['@babel/plugin-transform-typescript'],
          });
          content = transformed.code;
        } catch (e) {
          content = fs.readFileSync(filePath, 'utf8');
        }
      } else {
        content = fs.readFileSync(filePath, 'utf8');
      }
    }
    return content;
  };

  if (filePath.endsWith(PACKAGE_JSON)) {
    // Process a package.json that is returned as a PACKAGE type with its name.
    try {
      const fileData = JSON.parse(getJSONContent());

      if (fileData.name) {
        const relativeFilePath = path.relative(rootDir, filePath);
        id = fileData.name;
        module = [relativeFilePath, H.PACKAGE];
      }
    } catch (err) {
      throw new Error(`Cannot parse ${filePath} as JSON: ${err.message}`);
    }
  } else if (!blacklist.has(filePath.substr(filePath.lastIndexOf('.')))) {
    // Process a random file that is returned as a MODULE.
    if (hasteImpl) {
      id = hasteImpl.getHasteName(filePath);
    }

    if (computeDependencies) {
      const content = getContent();
      dependencies = Array.from(
        data.dependencyExtractor
          ? // $FlowFixMe
            require(data.dependencyExtractor).extract(
              content,
              dependencyExtractor.extract,
            )
          : dependencyExtractor.extract(content),
      );
    }

    if (id) {
      const relativeFilePath = path.relative(rootDir, filePath);
      module = [relativeFilePath, H.MODULE];
    }
  }

  // If a SHA-1 is requested on update, compute it.
  if (computeSha1) {
    sha1 = sha1hex(getContent() || fs.readFileSync(filePath));
  }

  return {dependencies, id, module, sha1};
}

export async function getSha1(data: WorkerMessage): Promise<WorkerMetadata> {
  const sha1 = data.computeSha1
    ? sha1hex(fs.readFileSync(data.filePath))
    : null;

  return {
    dependencies: undefined,
    id: undefined,
    module: undefined,
    sha1,
  };
}
