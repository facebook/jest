/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path, Glob} from 'types/Config';

import path from 'path';
import {ValidationError} from 'jest-validate';
import Resolver from 'jest-resolve';
import chalk from 'chalk';

type ResolveOptions = {|
  rootDir: string,
  key: string,
  filePath: Path,
  optional?: boolean,
|};

export const BULLET: string = chalk.bold('\u25cf ');
export const DOCUMENTATION_NOTE = `  ${chalk.bold(
  'Configuration Documentation:',
)}
  https://jestjs.io/docs/configuration.html
`;

const createValidationError = (message: string) =>
  new ValidationError(`${BULLET}Validation Error`, message, DOCUMENTATION_NOTE);

export const resolve = (
  resolver: ?string,
  {key, filePath, rootDir, optional}: ResolveOptions,
) => {
  const module = Resolver.findNodeModule(
    replaceRootDirInPath(rootDir, filePath),
    {
      basedir: rootDir,
      resolver,
    },
  );

  if (!module && !optional) {
    throw createValidationError(
      `  Module ${chalk.bold(filePath)} in the ${chalk.bold(
        key,
      )} option was not found.
         ${chalk.bold('<rootDir>')} is: ${rootDir}`,
    );
  }

  return module;
};

export const escapeGlobCharacters = (path: Path): Glob =>
  path.replace(/([()*{}\[\]!?\\])/g, '\\$1');

export const replaceRootDirInPath = (
  rootDir: string,
  filePath: Path,
): string => {
  if (!/^<rootDir>/.test(filePath)) {
    return filePath;
  }

  return path.resolve(
    rootDir,
    path.normalize('./' + filePath.substr('<rootDir>'.length)),
  );
};

const _replaceRootDirInObject = (rootDir: string, config: any): Object => {
  if (config !== null) {
    const newConfig = {};
    for (const configKey in config) {
      newConfig[configKey] =
        configKey === 'rootDir'
          ? config[configKey]
          : _replaceRootDirTags(rootDir, config[configKey]);
    }
    return newConfig;
  }
  return config;
};

export const _replaceRootDirTags = (rootDir: string, config: any) => {
  switch (typeof config) {
    case 'object':
      if (Array.isArray(config)) {
        return config.map(item => _replaceRootDirTags(rootDir, item));
      }
      if (config instanceof RegExp) {
        return config;
      }
      return _replaceRootDirInObject(rootDir, config);
    case 'string':
      return replaceRootDirInPath(rootDir, config);
  }
  return config;
};

export const resolveWithPrefix = (
  resolver: ?string,
  {
    filePath,
    humanOptionName,
    optionName,
    prefix,
    rootDir,
  }: {
    filePath: string,
    humanOptionName: string,
    optionName: string,
    prefix: string,
    rootDir: string,
  },
) => {
  const fileName = replaceRootDirInPath(rootDir, filePath);
  let module = Resolver.findNodeModule(`${prefix}${fileName}`, {
    basedir: rootDir,
    resolver,
  });
  if (module) {
    return module;
  }

  try {
    return require.resolve(`${prefix}${fileName}`);
  } catch (e) {}

  module = Resolver.findNodeModule(fileName, {
    basedir: rootDir,
    resolver,
  });
  if (module) {
    return module;
  }

  try {
    return require.resolve(fileName);
  } catch (e) {}

  throw createValidationError(
    `  ${humanOptionName} ${chalk.bold(
      fileName,
    )} cannot be found. Make sure the ${chalk.bold(
      optionName,
    )} configuration option points to an existing node module.`,
  );
};

/**
 * Finds the test environment to use:
 *
 * 1. looks for jest-environment-<name> relative to project.
 * 1. looks for jest-environment-<name> relative to Jest.
 * 1. looks for <name> relative to project.
 * 1. looks for <name> relative to Jest.
 */
export const getTestEnvironment = ({
  rootDir,
  testEnvironment: filePath,
}: {
  rootDir: string,
  testEnvironment: string,
}) =>
  resolveWithPrefix(null, {
    filePath,
    humanOptionName: 'Test environment',
    optionName: 'testEnvironment',
    prefix: 'jest-environment-',
    rootDir,
  });

/**
 * Finds the watch plugins to use:
 *
 * 1. looks for jest-watch-<name> relative to project.
 * 1. looks for jest-watch-<name> relative to Jest.
 * 1. looks for <name> relative to project.
 * 1. looks for <name> relative to Jest.
 */
export const getWatchPlugin = (
  resolver: ?string,
  {filePath, rootDir}: {filePath: string, rootDir: string},
) =>
  resolveWithPrefix(resolver, {
    filePath,
    humanOptionName: 'Watch plugin',
    optionName: 'watchPlugins',
    prefix: 'jest-watch-',
    rootDir,
  });

/**
 * Finds the runner to use:
 *
 * 1. looks for jest-runner-<name> relative to project.
 * 1. looks for jest-runner-<name> relative to Jest.
 * 1. looks for <name> relative to project.
 * 1. looks for <name> relative to Jest.
 */
export const getRunner = (
  resolver: ?string,
  {filePath, rootDir}: {filePath: string, rootDir: string},
) =>
  resolveWithPrefix(resolver, {
    filePath,
    humanOptionName: 'Jest Runner',
    optionName: 'runner',
    prefix: 'jest-runner-',
    rootDir,
  });

export const isJSONString = (text: ?string) =>
  text &&
  typeof text === 'string' &&
  text.startsWith('{') &&
  text.endsWith('}');
