/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import TestScheduler from '../TestScheduler';
import SummaryReporter from '../reporters/summary_reporter';
import * as testSchedulerHelper from '../testSchedulerHelper';

jest.mock('../reporters/default_reporter');
const mockSerialRunner = {
  isSerial: true,
  runTests: jest.fn(),
};
jest.mock('jest-runner-serial', () => jest.fn(() => mockSerialRunner), {
  virtual: true,
});

const mockParallelRunner = {
  runTests: jest.fn(),
};
jest.mock('jest-runner-parallel', () => jest.fn(() => mockParallelRunner), {
  virtual: true,
});

const spyShouldRunInBand = jest.spyOn(testSchedulerHelper, 'shouldRunInBand');

beforeEach(() => {
  mockSerialRunner.runTests.mockClear();
  mockParallelRunner.runTests.mockClear();
  spyShouldRunInBand.mockClear();
});

test('config for reporters supports `default`', () => {
  const undefinedReportersScheduler = new TestScheduler(
    {
      reporters: undefined,
    },
    {},
  );
  const numberOfReporters =
    undefinedReportersScheduler._dispatcher._reporters.length;

  const stringDefaultReportersScheduler = new TestScheduler(
    {
      reporters: ['default'],
    },
    {},
  );
  expect(stringDefaultReportersScheduler._dispatcher._reporters.length).toBe(
    numberOfReporters,
  );

  const defaultReportersScheduler = new TestScheduler(
    {
      reporters: [['default', {}]],
    },
    {},
  );
  expect(defaultReportersScheduler._dispatcher._reporters.length).toBe(
    numberOfReporters,
  );

  const emptyReportersScheduler = new TestScheduler(
    {
      reporters: [],
    },
    {},
  );
  expect(emptyReportersScheduler._dispatcher._reporters.length).toBe(0);
});

test('.addReporter() .removeReporter()', () => {
  const scheduler = new TestScheduler({}, {});
  const reporter = new SummaryReporter();
  scheduler.addReporter(reporter);
  expect(scheduler._dispatcher._reporters).toContain(reporter);
  scheduler.removeReporter(SummaryReporter);
  expect(scheduler._dispatcher._reporters).not.toContain(reporter);
});

test('schedule tests run in parallel per default', async () => {
  const scheduler = new TestScheduler({}, {});
  const test = {
    context: {
      config: {
        runner: 'jest-runner-parallel',
      },
      hasteFS: {
        matchFiles: jest.fn(() => []),
      },
    },
    path: './test/path.js',
  };
  const tests = [test, test];

  await scheduler.scheduleTests(tests, {isInterrupted: jest.fn()});

  expect(mockParallelRunner.runTests).toHaveBeenCalled();
  expect(mockParallelRunner.runTests.mock.calls[0][5].serial).toBeFalsy();
});

test('schedule tests run in serial if the runner flags them', async () => {
  const scheduler = new TestScheduler({}, {});
  const test = {
    context: {
      config: {
        runner: 'jest-runner-serial',
      },
      hasteFS: {
        matchFiles: jest.fn(() => []),
      },
    },
    path: './test/path.js',
  };

  const tests = [test, test];
  await scheduler.scheduleTests(tests, {isInterrupted: jest.fn()});

  expect(mockSerialRunner.runTests).toHaveBeenCalled();
  expect(mockSerialRunner.runTests.mock.calls[0][5].serial).toBeTruthy();
});

test('should bail after `n` failures', async () => {
  const scheduler = new TestScheduler({bail: 2}, {});
  const test = {
    context: {
      config: {
        rootDir: './',
        runner: 'jest-runner-serial',
      },
      hasteFS: {
        matchFiles: jest.fn(() => []),
      },
    },
    path: './test/path.js',
  };

  const tests = [test];
  const setState = jest.fn();
  await scheduler.scheduleTests(tests, {
    isInterrupted: jest.fn(),
    isWatchMode: () => true,
    setState,
  });
  await mockSerialRunner.runTests.mock.calls[0][3](test, {
    numFailingTests: 2,
    snapshot: {},
    testResults: [{}],
  });
  expect(setState).toBeCalledWith({interrupted: true});
});

test('should not bail if less than `n` failures', async () => {
  const scheduler = new TestScheduler({bail: 2}, {});
  const test = {
    context: {
      config: {
        rootDir: './',
        runner: 'jest-runner-serial',
      },
      hasteFS: {
        matchFiles: jest.fn(() => []),
      },
    },
    path: './test/path.js',
  };

  const tests = [test];
  const setState = jest.fn();
  await scheduler.scheduleTests(tests, {
    isInterrupted: jest.fn(),
    isWatchMode: () => true,
    setState,
  });
  await mockSerialRunner.runTests.mock.calls[0][3](test, {
    numFailingTests: 1,
    snapshot: {},
    testResults: [{}],
  });
  expect(setState).not.toBeCalled();
});

test('should set runInBand to run in serial', async () => {
  const scheduler = new TestScheduler({}, {});
  const test = {
    context: {
      config: {
        runner: 'jest-runner-parallel',
      },
      hasteFS: {
        matchFiles: jest.fn(() => []),
      },
    },
    path: './test/path.js',
  };
  const tests = [test, test];

  spyShouldRunInBand.mockReturnValue(true);

  await scheduler.scheduleTests(tests, {isInterrupted: jest.fn()});

  expect(spyShouldRunInBand).toHaveBeenCalled();
  expect(mockParallelRunner.runTests).toHaveBeenCalled();
  expect(mockParallelRunner.runTests.mock.calls[0][5].serial).toBeTruthy();
});

test('should set runInBand to not run in serial', async () => {
  const scheduler = new TestScheduler({}, {});
  const test = {
    context: {
      config: {
        runner: 'jest-runner-parallel',
      },
      hasteFS: {
        matchFiles: jest.fn(() => []),
      },
    },
    path: './test/path.js',
  };
  const tests = [test, test];

  spyShouldRunInBand.mockReturnValue(false);

  await scheduler.scheduleTests(tests, {isInterrupted: jest.fn()});

  expect(spyShouldRunInBand).toHaveBeenCalled();
  expect(mockParallelRunner.runTests).toHaveBeenCalled();
  expect(mockParallelRunner.runTests.mock.calls[0][5].serial).toBeFalsy();
});
