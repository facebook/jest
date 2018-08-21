/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

type JestMockFn = Function;

export type LocalModuleRequire = (moduleName: string) => any;

export type Jest = {|
  addMatchers(matchers: Object): void,
  autoMockOff(): Jest,
  autoMockOn(): Jest,
  clearAllMocks(): Jest,
  clearAllTimers(): void,
  deepUnmock(moduleName: string): Jest,
  disableAutomock(): Jest,
  doMock(moduleName: string, moduleFactory?: any): Jest,
  dontMock(moduleName: string): Jest,
  enableAutomock(): Jest,
  fn: (implementation?: Function) => JestMockFn,
  genMockFromModule(moduleName: string): any,
  isMockFunction(fn: Function): boolean,
  mock(moduleName: string, moduleFactory?: any, options?: Object): Jest,
  requireActual: LocalModuleRequire,
  requireMock: LocalModuleRequire,
  resetAllMocks(): Jest,
  resetModuleRegistry(): Jest,
  resetModules(): Jest,
  restoreAllMocks(): Jest,
  retryTimes(numRetries: number): Jest,
  runAllImmediates(): void,
  runAllPromises(runAllTicks: Function): void,
  runAllTicks(): void,
  runAllTimers(): void,
  runOnlyPendingTimers(): void,
  advanceTimersByTime(msToRun: number): void,
  runTimersToTime(msToRun: number): void,
  setMock(moduleName: string, moduleExports: any): Jest,
  setTimeout(timeout: number): Jest,
  spyOn(
    object: Object,
    methodName: string,
    accessType?: 'get' | 'set',
  ): JestMockFn,
  unmock(moduleName: string): Jest,
  useFakePromises(): Jest,
  useRealPromises(): Jest,
  useFakeTimers(): Jest,
  useRealTimers(): Jest,
|};
