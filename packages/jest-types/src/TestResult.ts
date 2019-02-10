/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {ConsoleBuffer} from './Console';

export type RawFileCoverage = {
  path: string;
  s: {
    [statementId: number]: number;
  };
  b: {
    [branchId: number]: number;
  };
  f: {
    [functionId: number]: number;
  };
  l: {
    [lineId: number]: number;
  };
  fnMap: {
    [functionId: number]: any;
  };
  statementMap: {
    [statementId: number]: any;
  };
  branchMap: {
    [branchId: number]: any;
  };
  inputSourceMap?: Object;
};

export type RawCoverage = {
  [filePath: string]: RawFileCoverage;
};
type FileCoverageTotal = {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
};

export type CoverageSummary = {
  lines: FileCoverageTotal;
  statements: FileCoverageTotal;
  branches: FileCoverageTotal;
  functions: FileCoverageTotal;
  merge: (other: CoverageSummary) => undefined;
};

export type FileCoverage = {
  getLineCoverage: () => Object;
  getUncoveredLines: () => Array<number>;
  getBranchCoverageByLine: () => Object;
  toJSON: () => Object;
  merge: (other: Object) => undefined;
  computeSimpleTotals: (property: string) => FileCoverageTotal;
  computeBranchTotals: () => FileCoverageTotal;
  resetHits: () => undefined;
  toSummary: () => CoverageSummary;
};

export type CoverageMap = {
  merge: (data: Object) => undefined;
  getCoverageSummary: () => FileCoverage;
  data: RawCoverage;
  addFileCoverage: (fileCoverage: RawFileCoverage) => undefined;
  files: () => Array<string>;
  fileCoverageFor: (file: string) => FileCoverage;
};

export type SerializableError = {
  code?: unknown;
  message: string;
  stack: string | null | undefined;
  type?: string;
};

export type FailedAssertion = {
  matcherName: string;
  message?: string;
  actual?: any;
  pass?: boolean;
  expected?: any;
  isNot?: boolean;
  stack?: string;
};

export type AssertionLocation = {
  fullName: string;
  path: string;
};

export type Status =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'todo'
  | 'disabled';

export type Bytes = number;

export type Milliseconds = number;
type Callsite = {
  column: number;
  line: number;
};

export type AssertionResult = {
  ancestorTitles: Array<string>;
  duration?: Milliseconds | null | undefined;
  failureMessages: Array<string>;
  fullName: string;
  invocations?: number;
  location: Callsite | null | undefined;
  numPassingAsserts: number;
  status: Status;
  title: string;
};

export type FormattedAssertionResult = {
  ancestorTitles: Array<string>;
  failureMessages: Array<string> | null;
  fullName: string;
  location: Callsite | null | undefined;
  status: Status;
  title: string;
};

export type AggregatedResultWithoutCoverage = {
  numFailedTests: number;
  numFailedTestSuites: number;
  numPassedTests: number;
  numPassedTestSuites: number;
  numPendingTests: number;
  numTodoTests: number;
  numPendingTestSuites: number;
  numRuntimeErrorTestSuites: number;
  numTotalTests: number;
  numTotalTestSuites: number;
  openHandles: Array<Error>;
  snapshot: SnapshotSummary;
  startTime: number;
  success: boolean;
  testResults: Array<TestResult>;
  wasInterrupted: boolean;
};

export type AggregatedResult = AggregatedResultWithoutCoverage & {
  coverageMap?: CoverageMap | null;
};

export type Suite = {
  title: string;
  suites: Array<Suite>;
  tests: Array<AssertionResult>;
};

export type TestResult = {
  console?: ConsoleBuffer | null;
  coverage?: RawCoverage;
  displayName?: string | null;
  failureMessage?: string | null;
  leaks: boolean;
  memoryUsage?: Bytes;
  numFailingTests: number;
  numPassingTests: number;
  numPendingTests: number;
  numTodoTests: number;
  openHandles: Array<Error>;
  perfStats: {
    end: Milliseconds;
    start: Milliseconds;
  };
  skipped: boolean;
  snapshot: {
    added: number;
    fileDeleted: boolean;
    matched: number;
    unchecked: number;
    uncheckedKeys: Array<string>;
    unmatched: number;
    updated: number;
  };
  sourceMaps: {
    [sourcePath: string]: string;
  };
  testExecError?: SerializableError;
  testFilePath: string;
  testResults: Array<AssertionResult>;
};

export type FormattedTestResult = {
  message: string;
  name: string;
  summary: string;
  status: 'failed' | 'passed';
  startTime: number;
  endTime: number;
  coverage: any;
  assertionResults: Array<FormattedAssertionResult>;
};

export type FormattedTestResults = {
  coverageMap?: CoverageMap | null | undefined;
  numFailedTests: number;
  numFailedTestSuites: number;
  numPassedTests: number;
  numPassedTestSuites: number;
  numPendingTests: number;
  numPendingTestSuites: number;
  numRuntimeErrorTestSuites: number;
  numTotalTests: number;
  numTotalTestSuites: number;
  snapshot: SnapshotSummary;
  startTime: number;
  success: boolean;
  testResults: Array<FormattedTestResult>;
  wasInterrupted: boolean;
};

export type CodeCoverageReporter = any;

export type CodeCoverageFormatter = (
  coverage: RawCoverage | null | undefined,
  reporter: CodeCoverageReporter,
) => Object | null | undefined;

export type UncheckedSnapshot = {
  filePath: string;
  keys: Array<string>;
};

export type SnapshotSummary = {
  added: number;
  didUpdate: boolean;
  failure: boolean;
  filesAdded: number;
  filesRemoved: number;
  filesUnmatched: number;
  filesUpdated: number;
  matched: number;
  total: number;
  unchecked: number;
  uncheckedKeysByFile: Array<UncheckedSnapshot>;
  unmatched: number;
  updated: number;
};
