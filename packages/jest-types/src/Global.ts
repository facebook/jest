/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {CoverageMapData} from 'istanbul-lib-coverage';

export type ValidTestReturnValues = void | undefined;
type TestReturnValuePromise = Promise<unknown>;
type TestReturnValueGenerator = Generator<void, unknown, void>;
export type TestReturnValue = ValidTestReturnValues | TestReturnValuePromise;

export type TestContext = Record<string, unknown>;

export type DoneFn = (reason?: string | Error) => void;
// these should not be undefined
export type DoneTakingTestFn = (
  this: TestContext | undefined,
  done: DoneFn,
) => ValidTestReturnValues;
export type PromiseReturningTestFn = (
  this: TestContext | undefined,
) => TestReturnValue;
export type GeneratorReturningTestFn = (
  this: TestContext | undefined,
) => TestReturnValueGenerator;

export type TestName = string;
export type TestFn =
  | PromiseReturningTestFn
  | GeneratorReturningTestFn
  | DoneTakingTestFn;
export type ConcurrentTestFn = () => TestReturnValuePromise;
export type BlockFn = () => void;
export type BlockName = string;
export type HookFn = TestFn;

export type Col = unknown;
export type Row = Array<Col>;
export type Table = Array<Row>;
export type ArrayTable = Table | Row;
export type TemplateTable = TemplateStringsArray;
export type TemplateData = Array<unknown>;
export type EachTable = ArrayTable | TemplateTable;

export type TestCallback = BlockFn | TestFn | ConcurrentTestFn;

export type EachTestFn<EachCallback extends TestCallback> = (
  ...args: Array<any>
) => ReturnType<EachCallback>;

// TODO: Get rid of this at some point
type Jasmine = {
  _DEFAULT_TIMEOUT_INTERVAL?: number;
  addMatchers: (matchers: Record<string, unknown>) => void;
};

type Each<EachCallback extends TestCallback> =
  | ((
      table: EachTable,
      ...taggedTemplateData: Array<unknown>
    ) => (
      title: string,
      test: EachTestFn<EachCallback>,
      timeout?: number,
    ) => void)
  | (() => () => void);

export interface HookBase {
  (fn: HookFn, timeout?: number): void;
}

export interface ItBase {
  (testName: TestName, fn: TestFn, timeout?: number): void;
  each: Each<TestFn>;
}

export interface It extends ItBase {
  only: ItBase;
  skip: ItBase;
  todo: (testName: TestName) => void;
}

export interface ItConcurrentBase {
  (testName: string, testFn: ConcurrentTestFn, timeout?: number): void;
  each: Each<ConcurrentTestFn>;
}

export interface ItConcurrentExtended extends ItConcurrentBase {
  only: ItConcurrentBase;
  skip: ItConcurrentBase;
}

export interface ItConcurrent extends It {
  concurrent: ItConcurrentExtended;
}

export interface DescribeBase {
  (blockName: BlockName, blockFn: BlockFn): void;
  each: Each<BlockFn>;
}

export interface Describe extends DescribeBase {
  only: DescribeBase;
  skip: DescribeBase;
}

export interface TestFrameworkGlobals {
  it: ItConcurrent;
  test: ItConcurrent;
  fit: ItBase & {concurrent?: ItConcurrentBase};
  xit: ItBase;
  xtest: ItBase;
  describe: Describe;
  xdescribe: DescribeBase;
  fdescribe: DescribeBase;
  beforeAll: HookBase;
  beforeEach: HookBase;
  afterEach: HookBase;
  afterAll: HookBase;
}

export interface GlobalAdditions extends TestFrameworkGlobals {
  __coverage__: CoverageMapData;
  jasmine: Jasmine;
  fail: () => void;
  pending: () => void;
  spyOn: () => void;
  spyOnProperty: () => void;
}

export interface Global
  extends GlobalAdditions,
    Omit<typeof globalThis, keyof GlobalAdditions> {
  [extras: string]: unknown;
}
