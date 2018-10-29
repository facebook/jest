/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ProjectConfig} from './Config';
import type {Global} from './Global';
import type {Script} from 'vm';
import type {ModuleMocker} from 'jest-mock';

export type EnvironmentOptions = {
  console?: Object,
};

declare class $JestEnvironment {
  constructor(config: ProjectConfig, options?: EnvironmentOptions): void;
  runScript(script: Script): any;
  global: Global;
  fakeTimers: {
    clearAllTimers(): void,
    runAllImmediates(): void,
    runAllTicks(): void,
    runAllTimers(): void,
    advanceTimersByTime(msToRun: number): void,
    runOnlyPendingTimers(): void,
    runWithRealTimers(callback: any): void,
    getTimerCount(): number,
    useFakePromises(): void,
    useFakeTimers(): void,
    useRealPromises(): void,
    useRealTimers(): void,
  };
  fakePromises: {
    runAllPromises(): void,
    clearAllPromises(): void,
    useFakePromises(): void,
    useRealPromises(): void,
  };
  testFilePath: string;
  moduleMocker: ModuleMocker;
  setup(): Promise<void>;
  teardown(): Promise<void>;
}

export type Environment = $JestEnvironment;
export type EnvironmentClass = typeof $JestEnvironment;
