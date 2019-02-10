/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config, TestResult} from '@jest/types';

type TestSuiteInfo = {
  config: Config.ProjectConfig;
  duration?: number;
  testPath: string;
};

export type JestHookExposedFS = {
  projects: Array<{
    config: Config.ProjectConfig;
    testPaths: Array<Config.Path>;
  }>;
};

export type FileChange = (fs: JestHookExposedFS) => void;
export type ShouldRunTestSuite = (
  testSuiteInfo: TestSuiteInfo,
) => Promise<boolean>;
export type TestRunComplete = (results: TestResult.AggregatedResult) => void;

export type JestHookSubscriber = {
  onFileChange: (fn: FileChange) => void;
  onTestRunComplete: (fn: TestRunComplete) => void;
  shouldRunTestSuite: (fn: ShouldRunTestSuite) => void;
};

export type JestHookEmitter = {
  onFileChange: (fs: JestHookExposedFS) => void;
  onTestRunComplete: (results: TestResult.AggregatedResult) => void;
  shouldRunTestSuite: (testSuiteInfo: TestSuiteInfo) => Promise<boolean>;
};

export type UsageData = {
  key: string;
  prompt: string;
};

export type AllowedConfigOptions = Partial<
  Pick<
    Config.GlobalConfig,
    | 'bail'
    | 'changedSince'
    | 'collectCoverage'
    | 'collectCoverageFrom'
    | 'collectCoverageOnlyFrom'
    | 'coverageDirectory'
    | 'coverageReporters'
    | 'notify'
    | 'notifyMode'
    | 'onlyFailures'
    | 'reporters'
    | 'testNamePattern'
    | 'testPathPattern'
    | 'updateSnapshot'
    | 'verbose'
  > & {mode: 'watch' | 'watchAll'}
>;

export interface WatchPlugin {
  isInternal?: boolean;
  apply?: (hooks: JestHookSubscriber) => void;
  getUsageInfo?: (
    globalConfig: Config.GlobalConfig,
  ) => UsageData | undefined | null;
  onKey?: (value: string) => void;
  run?: (
    globalConfig: Config.GlobalConfig,
    updateConfigAndRun: (config?: AllowedConfigOptions) => void,
  ) => Promise<void | boolean>;
}

export type ScrollOptions = {
  offset: number;
  max: number;
};
