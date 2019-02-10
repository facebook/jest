/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import TestScheduler from '../TestScheduler';
import NotifyReporter from '../reporters/notify_reporter';
import type {TestSchedulerContext} from '../TestScheduler';
import type {AggregatedResult} from '../../../../types/TestResult';

jest.mock('../reporters/default_reporter');
jest.mock('node-notifier', () => ({
  notify: jest.fn(),
}));

const initialContext: TestSchedulerContext = {
  firstRun: true,
  previousSuccess: false,
};

const aggregatedResultsSuccess: AggregatedResult = {
  numFailedTestSuites: 0,
  numFailedTests: 0,
  numPassedTestSuites: 1,
  numPassedTests: 3,
  numRuntimeErrorTestSuites: 0,
  numTotalTestSuites: 1,
  numTotalTests: 3,
  success: true,
};

const aggregatedResultsFailure: AggregatedResult = {
  numFailedTestSuites: 1,
  numFailedTests: 3,
  numPassedTestSuites: 0,
  numPassedTests: 9,
  numRuntimeErrorTestSuites: 0,
  numTotalTestSuites: 1,
  numTotalTests: 3,
  success: false,
};

const aggregatedResultsNoTests: AggregatedResult = {
  numFailedTestSuites: 0,
  numFailedTests: 0,
  numPassedTestSuites: 0,
  numPassedTests: 0,
  numPendingTestSuites: 0,
  numPendingTests: 0,
  numRuntimeErrorTestSuites: 0,
  numTotalTestSuites: 0,
  numTotalTests: 0,
};

// Simulated sequence of events for NotifyReporter
const notifyEvents = [
  aggregatedResultsNoTests,
  aggregatedResultsSuccess,
  aggregatedResultsFailure,
  aggregatedResultsSuccess,
  aggregatedResultsSuccess,
  aggregatedResultsFailure,
  aggregatedResultsFailure,
];

test('.addReporter() .removeReporter()', () => {
  const scheduler = new TestScheduler({}, {}, {...initialContext});
  const reporter = new NotifyReporter();
  scheduler.addReporter(reporter);
  expect(scheduler._dispatcher._reporters).toContain(reporter);
  scheduler.removeReporter(NotifyReporter);
  expect(scheduler._dispatcher._reporters).not.toContain(reporter);
});

const testModes = ({notifyMode, arl, rootDir, moduleName}) => {
  const notify = require('node-notifier');

  let previousContext = initialContext;
  arl.forEach((ar, i) => {
    const newContext = Object.assign(previousContext, {
      firstRun: i === 0,
      previousSuccess: previousContext.previousSuccess,
    });
    const reporter = new NotifyReporter(
      {notify: true, notifyMode, rootDir},
      {},
      newContext,
    );
    previousContext = newContext;
    const contexts = new Set();

    if (moduleName != null) {
      contexts.add({
        hasteFS: {
          getModuleName() {
            return moduleName;
          },

          matchFiles() {
            return ['package.json'];
          },
        },
      });
    }

    reporter.onRunComplete(contexts, ar);

    if (ar.numTotalTests === 0) {
      expect(notify.notify).not.toHaveBeenCalled();
    }
  });

  expect(
    notify.notify.mock.calls.map(([{message, title}]) => ({
      message: message.replace('\u26D4\uFE0F ', '').replace('\u2705 ', ''),
      title,
    })),
  ).toMatchSnapshot();
};

test('test always', () => {
  testModes({arl: notifyEvents, notifyMode: 'always'});
});

test('test success', () => {
  testModes({arl: notifyEvents, notifyMode: 'success'});
});

test('test change', () => {
  testModes({arl: notifyEvents, notifyMode: 'change'});
});

test('test success-change', () => {
  testModes({arl: notifyEvents, notifyMode: 'success-change'});
});

test('test failure-change', () => {
  testModes({arl: notifyEvents, notifyMode: 'failure-change'});
});

test('test always with rootDir', () => {
  testModes({arl: notifyEvents, notifyMode: 'always', rootDir: 'some-test'});
});

test('test success with rootDir', () => {
  testModes({arl: notifyEvents, notifyMode: 'success', rootDir: 'some-test'});
});

test('test change with rootDir', () => {
  testModes({arl: notifyEvents, notifyMode: 'change', rootDir: 'some-test'});
});

test('test success-change with rootDir', () => {
  testModes({
    arl: notifyEvents,
    notifyMode: 'success-change',
    rootDir: 'some-test',
  });
});

test('test failure-change with rootDir', () => {
  testModes({
    arl: notifyEvents,
    notifyMode: 'failure-change',
    rootDir: 'some-test',
  });
});

test('test always with moduleName', () => {
  testModes({
    arl: notifyEvents,
    moduleName: 'some-module',
    notifyMode: 'always',
  });
});

test('test success with moduleName', () => {
  testModes({
    arl: notifyEvents,
    moduleName: 'some-module',
    notifyMode: 'success',
  });
});

test('test change with moduleName', () => {
  testModes({
    arl: notifyEvents,
    moduleName: 'some-module',
    notifyMode: 'change',
  });
});

test('test success-change with moduleName', () => {
  testModes({
    arl: notifyEvents,
    moduleName: 'some-module',
    notifyMode: 'success-change',
  });
});

test('test failure-change with moduleName', () => {
  testModes({
    arl: notifyEvents,
    moduleName: 'some-module',
    notifyMode: 'failure-change',
  });
});

afterEach(() => {
  jest.clearAllMocks();
});
