/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import type {Config} from '@jest/types';
import {ValidationError} from 'jest-validate';
import Resolver = require('jest-resolve');
import chalk = require('chalk');

type ResolveOptions = {
  rootDir: Config.Path;
  key: string;
  filePath: Config.Path;
  optional?: boolean;
};

export const BULLET: string = chalk.bold('\u25cf ');
export const DOCUMENTATION_NOTE = `  ${chalk.bold(
  'Configuration Documentation:',
)}
  https://jestjs.io/docs/configuration.html
`;

const createValidationError = (message: string) =>
  new ValidationError(`${BULLET}Validation Error`, message, DOCUMENTATION_NOTE);

export const resolve = (
  resolver: string | null | undefined,
  {key, filePath, rootDir, optional}: ResolveOptions,
): string => {
  const module = Resolver.findNodeModule(
    replaceRootDirInPath(rootDir, filePath),
    {
      basedir: rootDir,
      resolver: resolver || undefined,
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
  /// can cast as string since nulls will be thrown
  return module?.path as string;
};

export const escapeGlobCharacters = (path: Config.Path): Config.Glob =>
  path.replace(/([()*{}\[\]!?\\])/g, '\\$1');

export const replaceRootDirInPath = (
  rootDir: Config.Path,
  filePath: Config.Path,
): string => {
  if (!/^<rootDir>/.test(filePath)) {
    return filePath;
  }

  return path.resolve(
    rootDir,
    path.normalize('./' + filePath.substr('<rootDir>'.length)),
  );
};

const _replaceRootDirInObject = <T extends ReplaceRootDirConfigObj>(
  rootDir: Config.Path,
  config: T,
): T => {
  const newConfig = {} as T;
  for (const configKey in config) {
    newConfig[configKey] =
      configKey === 'rootDir'
        ? config[configKey]
        : _replaceRootDirTags(rootDir, config[configKey]);
  }
  return newConfig;
};

type OrArray<T> = T | Array<T>;
type ReplaceRootDirConfigObj = Record<string, Config.Path>;
type ReplaceRootDirConfigValues =
  | OrArray<ReplaceRootDirConfigObj>
  | OrArray<RegExp>
  | OrArray<Config.Path>;

export const _replaceRootDirTags = <T extends ReplaceRootDirConfigValues>(
  rootDir: Config.Path,
  config: T,
): T => {
  if (config == null) {
    return config;
  }
  switch (typeof config) {
    case 'object':
      if (Array.isArray(config)) {
        /// can be string[] or {}[]
        return config.map(item => _replaceRootDirTags(rootDir, item)) as T;
      }
      if (config instanceof RegExp) {
        return config;
      }

      return _replaceRootDirInObject(
        rootDir,
        config as ReplaceRootDirConfigObj,
      ) as T;
    case 'string':
      return replaceRootDirInPath(rootDir, config) as T;
  }
  return config;
};

export const resolveWithPrefix = (
  resolver: string | undefined | null,
  {
    filePath,
    humanOptionName,
    optionName,
    prefix,
    rootDir,
  }: {
    filePath: string;
    humanOptionName: string;
    optionName: string;
    prefix: string;
    rootDir: Config.Path;
  },
): string => {
  const fileName = replaceRootDirInPath(rootDir, filePath);
  let module = Resolver.findNodeModule(`${prefix}${fileName}`, {
    basedir: rootDir,
    resolver: resolver || undefined,
  });
  if (module) {
    return module.path;
  }

  try {
    return require.resolve(`${prefix}${fileName}`);
  } catch (e) {}

  module = Resolver.findNodeModule(fileName, {
    basedir: rootDir,
    resolver: resolver || undefined,
  });
  if (module) {
    return module.path;
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
  rootDir: Config.Path;
  testEnvironment: string;
}): string =>
  resolveWithPrefix(undefined, {
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
  resolver: string | undefined | null,
  {filePath, rootDir}: {filePath: string; rootDir: Config.Path},
): string =>
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
  resolver: string | undefined | null,
  {filePath, rootDir}: {filePath: string; rootDir: Config.Path},
): string =>
  resolveWithPrefix(resolver, {
    filePath,
    humanOptionName: 'Jest Runner',
    optionName: 'runner',
    prefix: 'jest-runner-',
    rootDir,
  });

type JSONString = string & {readonly $$type: never}; // newtype
export const isJSONString = (text?: JSONString | string): text is JSONString =>
  text != null &&
  typeof text === 'string' &&
  text.startsWith('{') &&
  text.endsWith('}');

export const getSequencer = (
  resolver: string | undefined | null,
  {filePath, rootDir}: {filePath: string; rootDir: Config.Path},
): string =>
  resolveWithPrefix(resolver, {
    filePath,
    humanOptionName: 'Jest Sequencer',
    optionName: 'testSequencer',
    prefix: 'jest-sequencer-',
    rootDir,
  });
