/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig, Path, ProjectConfig} from 'types/Config';
import type {SerializableError, TestResult} from 'types/TestResult';
import type {SerializableModuleMap} from 'types/HasteMap';
import type {ErrorWithCode} from 'types/Errors';
import type {TestRunnerContext} from 'types/TestRunner';

import exit from 'exit';
import HasteMap from 'jest-haste-map';
import {separateMessageFromStack} from 'jest-message-util';
import Runtime from 'jest-runtime';
import runTest from './runTest';

export type WorkerData = {|
  config: ProjectConfig,
  globalConfig: GlobalConfig,
  path: Path,
  serializableModuleMap: ?SerializableModuleMap,
  context?: TestRunnerContext,
|};

// Make sure uncaught errors are logged before we exit.
process.on('uncaughtException', err => {
  console.error(err.stack);
  exit(1);
});

const formatError = (error: string | ErrorWithCode): SerializableError => {
  if (typeof error === 'string') {
    const {message, stack} = separateMessageFromStack(error);
    return {
      message,
      stack,
      type: 'Error',
    };
  }

  return {
    code: error.code || undefined,
    message: error.message,
    stack: error.stack,
    type: 'Error',
  };
};

const resolvers = Object.create(null);
const getResolver = (config, moduleMap) => {
  // In watch mode, the raw module map with all haste modules is passed from
  // the test runner to the watch command. This is because jest-haste-map's
  // watch mode does not persist the haste map on disk after every file change.
  // To make this fast and consistent, we pass it from the TestRunner.
  if (moduleMap) {
    return Runtime.createResolver(config, moduleMap);
  } else {
    const name = config.name;
    if (!resolvers[name]) {
      resolvers[name] = Runtime.createResolver(
        config,
        Runtime.createHasteMap(config).readModuleMap(),
      );
    }
    return resolvers[name];
  }
};

export async function worker({
  config,
  globalConfig,
  path,
  serializableModuleMap,
  context,
}: WorkerData): Promise<TestResult> {
  try {
    const moduleMap = serializableModuleMap
      ? HasteMap.ModuleMap.fromJSON(serializableModuleMap)
      : null;
    return await runTest(
      path,
      globalConfig,
      config,
      getResolver(config, moduleMap),
      context,
    );
  } catch (error) {
    throw formatError(error);
  }
}
