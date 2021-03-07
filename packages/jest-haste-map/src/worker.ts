/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createHash} from 'crypto';
import * as path from 'path';
import * as fs from 'graceful-fs';
import defaultBlocklist from './blocklist';
import H from './constants';
import * as dependencyExtractor from './lib/dependencyExtractor';
import type {HasteImpl, WorkerMessage, WorkerMetadata} from './types';

const PACKAGE_JSON = path.sep + 'package.json';

let hasteImpl: HasteImpl | null = null;
let hasteImplModulePath: string | null = null;

function sha1hex(content: string | Buffer): string {
  return createHash('sha1').update(content).digest('hex');
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
    hasteImpl = require(hasteImplModulePath);
  }

  let content: string | undefined;
  let dependencies: WorkerMetadata['dependencies'];
  let id: WorkerMetadata['id'];
  let module: WorkerMetadata['module'];
  let sha1: WorkerMetadata['sha1'];

  const {computeDependencies, computeSha1, rootDir, filePath} = data;
  const blocklist: Set<string> = data.hasteBlocklistModulePath
    ? require(data.hasteBlocklistModulePath)
    : defaultBlocklist;

  const getContent = (): string => {
    if (content === undefined) {
      content = fs.readFileSync(filePath, 'utf8');
    }

    return content;
  };

  if (filePath.endsWith(PACKAGE_JSON)) {
    // Process a package.json that is returned as a PACKAGE type with its name.
    try {
      const fileData = JSON.parse(getContent());

      if (fileData.name) {
        const relativeFilePath = path.relative(rootDir, filePath);
        id = fileData.name;
        module = [relativeFilePath, H.PACKAGE];
      }
    } catch (err) {
      throw new Error(`Cannot parse ${filePath} as JSON: ${err.message}`);
    }
  } else if (!blocklist.has(filePath.substr(filePath.lastIndexOf('.')))) {
    // Process a random file that is returned as a MODULE.
    if (hasteImpl) {
      id = hasteImpl.getHasteName(filePath);
    }

    if (computeDependencies) {
      const content = getContent();
      dependencies = Array.from(
        data.dependencyExtractor
          ? require(data.dependencyExtractor).extract(
              content,
              filePath,
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
