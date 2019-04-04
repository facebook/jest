/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import {Config} from '@jest/types';
import chalk from 'chalk';

export type SnapshotResolver = {
  testPathForConsistencyCheck: string;
  resolveSnapshotPath(testPath: Config.Path, extension?: string): Config.Path;
  resolveTestPath(snapshotPath: Config.Path, extension?: string): Config.Path;
};

export const EXTENSION = 'snap';
export const DOT_EXTENSION = '.' + EXTENSION;

export const isSnapshotPath = (path: string): boolean =>
  path.endsWith(DOT_EXTENSION);

const cache: Map<Config.Path, SnapshotResolver> = new Map();
export const buildSnapshotResolver = (
  config: Config.ProjectConfig,
): SnapshotResolver => {
  const key = config.rootDir;
  if (!cache.has(key)) {
    cache.set(key, createSnapshotResolver(config.snapshotResolver));
  }
  return cache.get(key)!;
};

function createSnapshotResolver(
  snapshotResolverPath?: Config.Path | null,
): SnapshotResolver {
  return typeof snapshotResolverPath === 'string'
    ? createCustomSnapshotResolver(snapshotResolverPath)
    : createDefaultSnapshotResolver();
}

function createDefaultSnapshotResolver(): SnapshotResolver {
  return {
    resolveSnapshotPath: (testPath: Config.Path) =>
      path.join(
        path.join(path.dirname(testPath), '__snapshots__'),
        path.basename(testPath) + DOT_EXTENSION,
      ),

    resolveTestPath: (snapshotPath: Config.Path) =>
      path.resolve(
        path.dirname(snapshotPath),
        '..',
        path.basename(snapshotPath, DOT_EXTENSION),
      ),

    testPathForConsistencyCheck: path.posix.join(
      'consistency_check',
      '__tests__',
      'example.test.js',
    ),
  };
}

function createCustomSnapshotResolver(
  snapshotResolverPath: Config.Path,
): SnapshotResolver {
  const custom: SnapshotResolver = require(snapshotResolverPath);

  const keys: Array<[keyof SnapshotResolver, string]> = [
    ['resolveSnapshotPath', 'function'],
    ['resolveTestPath', 'function'],
    ['testPathForConsistencyCheck', 'string'],
  ];
  keys.forEach(([propName, requiredType]) => {
    if (typeof custom[propName] !== requiredType) {
      throw new TypeError(mustImplement(propName, requiredType));
    }
  });

  const customResolver = {
    resolveSnapshotPath: (testPath: Config.Path) =>
      custom.resolveSnapshotPath(testPath, DOT_EXTENSION),
    resolveTestPath: (snapshotPath: Config.Path) =>
      custom.resolveTestPath(snapshotPath, DOT_EXTENSION),
    testPathForConsistencyCheck: custom.testPathForConsistencyCheck,
  };

  verifyConsistentTransformations(customResolver);

  return customResolver;
}

function mustImplement(propName: string, requiredType: string) {
  return (
    chalk.bold(
      `Custom snapshot resolver must implement a \`${propName}\` as a ${requiredType}.`,
    ) +
    '\nDocumentation: https://facebook.github.io/jest/docs/en/configuration.html#snapshotResolver'
  );
}

function verifyConsistentTransformations(custom: SnapshotResolver) {
  const resolvedSnapshotPath = custom.resolveSnapshotPath(
    custom.testPathForConsistencyCheck,
  );
  const resolvedTestPath = custom.resolveTestPath(resolvedSnapshotPath);
  if (resolvedTestPath !== custom.testPathForConsistencyCheck) {
    throw new Error(
      chalk.bold(
        `Custom snapshot resolver functions must transform paths consistently, i.e. expects resolveTestPath(resolveSnapshotPath('${
          custom.testPathForConsistencyCheck
        }')) === ${resolvedTestPath}`,
      ),
    );
  }
}
