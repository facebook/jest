/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {GlobalConfig} from 'types/Config';
import type {JestHookSubscriber} from 'types/JestHooks';

export type UsageData = {
  key: string,
  prompt: string,
};

export interface WatchPlugin {
  +isInternal?: boolean;
  +apply?: (hooks: JestHookSubscriber) => void;
  +getUsageInfo?: (globalConfig: GlobalConfig) => ?UsageData;
  +onKey?: (value: string) => void;
  +run?: (
    globalConfig: GlobalConfig,
    updateConfigAndRun: Function,
  ) => Promise<void | boolean>;
}
