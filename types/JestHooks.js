/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AggregatedResult} from './TestResult';
import type {Path, ProjectConfig} from './Config';

type TestSuiteInfo = {
  config: ProjectConfig,
  duration: ?number,
  testPath: string,
};

export type JestHookExposedFS = {
  projects: Array<{config: ProjectConfig, testPaths: Array<Path>}>,
};

export type FileChange = (fs: JestHookExposedFS) => void;
export type ShouldRunTestSuite = (
  testSuiteInfo: TestSuiteInfo,
) => Promise<boolean>;
export type TestRunComplete = (results: AggregatedResult) => void;

export type JestHookSubscriber = {
  onFileChange: (fn: FileChange) => void,
  onTestRunComplete: (fn: TestRunComplete) => void,
  shouldRunTestSuite: (fn: ShouldRunTestSuite) => void,
};

export type JestHookEmitter = {
  onFileChange: (fs: JestHookExposedFS) => void,
  onTestRunComplete: (results: AggregatedResult) => void,
  shouldRunTestSuite: (testSuiteInfo: TestSuiteInfo) => Promise<boolean>,
};
