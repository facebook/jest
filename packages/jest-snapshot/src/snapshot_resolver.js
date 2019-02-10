// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

import type {ProjectConfig, Path} from 'types/Config';
import type {SnapshotResolver} from 'types/SnapshotResolver';
import chalk from 'chalk';
import path from 'path';

export const EXTENSION = 'snap';
export const DOT_EXTENSION = '.' + EXTENSION;

export const isSnapshotPath = (path: string): boolean =>
  path.endsWith(DOT_EXTENSION);

const cache: Map<Path, SnapshotResolver> = new Map();
export const buildSnapshotResolver = (
  config: ProjectConfig,
): SnapshotResolver => {
  const key = config.rootDir;
  if (!cache.has(key)) {
    cache.set(key, createSnapshotResolver(config.snapshotResolver));
  }
  return cache.get(key);
};

function createSnapshotResolver(snapshotResolverPath: ?Path): SnapshotResolver {
  return typeof snapshotResolverPath === 'string'
    ? createCustomSnapshotResolver(snapshotResolverPath)
    : createDefaultSnapshotResolver();
}

function createDefaultSnapshotResolver() {
  return {
    resolveSnapshotPath: (testPath: Path) =>
      path.join(
        path.join(path.dirname(testPath), '__snapshots__'),
        path.basename(testPath) + DOT_EXTENSION,
      ),

    resolveTestPath: (snapshotPath: Path) =>
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
  snapshotResolverPath: Path,
): SnapshotResolver {
  const custom = (require(snapshotResolverPath): SnapshotResolver);

  [
    ['resolveSnapshotPath', 'function'],
    ['resolveTestPath', 'function'],
    ['testPathForConsistencyCheck', 'string'],
  ].forEach(([propName, requiredType]) => {
    if (typeof custom[propName] !== requiredType) {
      throw new TypeError(mustImplement(propName, requiredType));
    }
  });

  const customResolver = {
    resolveSnapshotPath: testPath =>
      custom.resolveSnapshotPath(testPath, DOT_EXTENSION),
    resolveTestPath: snapshotPath =>
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
