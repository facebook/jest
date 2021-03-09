/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import exit = require('exit');
import type {SerializableError, TestResult} from '@jest/test-result';
import type {Config} from '@jest/types';
import {ModuleMap, SerializableModuleMap} from 'jest-haste-map';
import {separateMessageFromStack} from 'jest-message-util';
import type Resolver from 'jest-resolve';
import Runtime from 'jest-runtime';
import {messageParent} from 'jest-worker';
import runTest from './runTest';
import type {
  ErrorWithCode,
  TestFileEvent,
  TestRunnerSerializedContext,
} from './types';

export type SerializableResolver = {
  config: Config.ProjectConfig;
  serializableModuleMap: SerializableModuleMap;
};

type WorkerData = {
  config: Config.ProjectConfig;
  globalConfig: Config.GlobalConfig;
  path: Config.Path;
  context?: TestRunnerSerializedContext;
};

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

const resolvers = new Map<string, Resolver>();
const getResolver = (config: Config.ProjectConfig) => {
  const resolver = resolvers.get(config.id);
  if (!resolver) {
    throw new Error('Cannot find resolver for: ' + config.id);
  }
  return resolver;
};

export function setup(setupData: {
  serializableResolvers: Array<SerializableResolver>;
}): void {
  // Module maps that will be needed for the test runs are passed.
  for (const {
    config,
    serializableModuleMap,
  } of setupData.serializableResolvers) {
    const moduleMap = ModuleMap.fromJSON(serializableModuleMap);
    resolvers.set(config.id, Runtime.createResolver(config, moduleMap));
  }
}

const sendMessageToJest: TestFileEvent = (eventName, args) => {
  messageParent([eventName, args]);
};

export async function worker({
  config,
  globalConfig,
  path,
  context,
}: WorkerData): Promise<TestResult> {
  try {
    return await runTest(
      path,
      globalConfig,
      config,
      getResolver(config),
      context && {
        ...context,
        changedFiles: context.changedFiles && new Set(context.changedFiles),
        sourcesRelatedToTestsInChangedFiles:
          context.sourcesRelatedToTestsInChangedFiles &&
          new Set(context.sourcesRelatedToTestsInChangedFiles),
      },
      sendMessageToJest,
    );
  } catch (error) {
    throw formatError(error);
  }
}
