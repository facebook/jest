/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Test} from 'types/TestRunner';
import type {TestResult} from 'types/TestResult';
import type {GlobalConfig} from 'types/Config';

export default class FailedTestsCache {
  _enabledTestsMap: ?{[key: string]: {[key: string]: boolean}};

  filterTests(tests: Array<Test>): Array<Test> {
    if (!this._enabledTestsMap) {
      return tests;
    }
    // $FlowFixMe
    return tests.filter(testResult => this._enabledTestsMap[testResult.path]);
  }

  setTestResults(testResults: Array<TestResult>) {
    this._enabledTestsMap = (testResults || [])
      .filter(testResult => testResult.numFailingTests)
      .reduce((suiteMap, testResult) => {
        suiteMap[testResult.testFilePath] = testResult.testResults
          .filter(test => test.status === 'failed')
          .reduce((testMap, test) => {
            testMap[test.fullName] = true;
            return testMap;
          }, {});
        return suiteMap;
      }, {});
    this._enabledTestsMap = Object.freeze(this._enabledTestsMap);
  }

  updateConfig(globalConfig: GlobalConfig): GlobalConfig {
    if (!this._enabledTestsMap) {
      return globalConfig;
    }
    const newConfig: GlobalConfig = {...globalConfig};
    newConfig.enabledTestsMap = this._enabledTestsMap;
    return Object.freeze(newConfig);
  }
}
