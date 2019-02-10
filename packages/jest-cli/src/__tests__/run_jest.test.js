// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

import runJest from '../runJest';

jest.mock('jest-util');

const processErrWriteFn = process.stderr.write;
describe('runJest', () => {
  let stderrSpy;
  beforeEach(async () => {
    process.exit = jest.fn();
    process.stderr.write = jest.fn();
    process.stderr.write.mockReset();
    stderrSpy = jest.spyOn(process.stderr, 'write');

    await runJest({
      changedFilesPromise: Promise.resolve({repos: {git: {size: 0}}}),
      contexts: [],
      globalConfig: {watch: true},
      onComplete: () => null,
      outputStream: {},
      startRun: {},
      testWatcher: {isInterrupted: () => true},
    });
  });

  afterEach(() => {
    process.stderr.write = processErrWriteFn;
  });

  test('when watch is set then exit process', () => {
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('when watch is set then an error message is printed', () => {
    expect(stderrSpy).toHaveBeenCalled();
  });
});
