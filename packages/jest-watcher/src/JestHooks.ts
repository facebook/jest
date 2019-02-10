/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  JestHookSubscriber,
  JestHookEmitter,
  FileChange,
  ShouldRunTestSuite,
  TestRunComplete,
} from './types';

type AvailableHooks =
  | 'onFileChange'
  | 'onTestRunComplete'
  | 'shouldRunTestSuite';

class JestHooks {
  _listeners: {
    onFileChange: Array<FileChange>;
    onTestRunComplete: Array<TestRunComplete>;
    shouldRunTestSuite: Array<ShouldRunTestSuite>;
  };

  constructor() {
    this._listeners = {
      onFileChange: [],
      onTestRunComplete: [],
      shouldRunTestSuite: [],
    };
  }

  isUsed(hook: AvailableHooks) {
    return this._listeners[hook] && this._listeners[hook].length;
  }

  getSubscriber(): JestHookSubscriber {
    return {
      onFileChange: fn => {
        this._listeners.onFileChange.push(fn);
      },
      onTestRunComplete: fn => {
        this._listeners.onTestRunComplete.push(fn);
      },
      shouldRunTestSuite: fn => {
        this._listeners.shouldRunTestSuite.push(fn);
      },
    };
  }

  getEmitter(): JestHookEmitter {
    return {
      onFileChange: fs =>
        this._listeners.onFileChange.forEach(listener => listener(fs)),
      onTestRunComplete: results =>
        this._listeners.onTestRunComplete.forEach(listener =>
          listener(results),
        ),
      shouldRunTestSuite: async testSuiteInfo => {
        const result = await Promise.all(
          this._listeners.shouldRunTestSuite.map(listener =>
            listener(testSuiteInfo),
          ),
        );

        return result.every(Boolean);
      },
    };
  }
}

export default JestHooks;
