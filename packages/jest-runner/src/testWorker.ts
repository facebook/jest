/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Config} from '@jest/types';
import {SerializableError, TestResult} from '@jest/test-result';
import HasteMap = require('jest-haste-map');
import exit = require('exit');
import {separateMessageFromStack} from 'jest-message-util';
import Runtime = require('jest-runtime');
import Resolver = require('jest-resolve');
import {messageParent} from 'jest-worker';
import {ErrorWithCode, TestRunnerSerializedContext} from './types';
import runTest from './runTest';

export type SerializableResolver = {
  config: Config.ProjectConfig;
  serializableModuleMap: HasteMap.SerializableModuleMap;
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
  const resolver = resolvers.get(config.name);
  if (!resolver) {
    throw new Error('Cannot find resolver for: ' + config.name);
  }
  return resolver;
};

export function setup(setupData: {
  serializableResolvers: Array<SerializableResolver>;
}) {
  // Module maps that will be needed for the test runs are passed.
  for (const {
    config,
    serializableModuleMap,
  } of setupData.serializableResolvers) {
    const moduleMap = HasteMap.ModuleMap.fromJSON(serializableModuleMap);
    resolvers.set(config.name, Runtime.createResolver(config, moduleMap));
  }
}

const sendMessageToJest = (eventName: string, args: Array<any>) => {
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
      sendMessageToJest,
      context && {
        ...context,
        changedFiles: context.changedFiles && new Set(context.changedFiles),
      },
    );
  } catch (error) {
    throw formatError(error);
  }
}
