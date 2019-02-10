/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig, Path, ProjectConfig} from 'types/Config';
import type {Plugin} from 'types/PrettyFormat';

import {extractExpectedAssertionsErrors, getState, setState} from 'expect';
import {
  buildSnapshotResolver,
  SnapshotState,
  addSerializer,
} from 'jest-snapshot';

export type SetupOptions = {|
  config: ProjectConfig,
  globalConfig: GlobalConfig,
  localRequire: (moduleName: string) => Plugin,
  testPath: Path,
|};

// Get suppressed errors form  jest-matchers that weren't throw during
// test execution and add them to the test result, potentially failing
// a passing test.
const addSuppressedErrors = result => {
  const {suppressedErrors} = getState();
  setState({suppressedErrors: []});
  if (suppressedErrors.length) {
    result.status = 'failed';

    result.failedExpectations = suppressedErrors.map(error => ({
      actual: '',
      // passing error for custom test reporters
      error,
      expected: '',
      message: error.message,
      passed: false,
      stack: error.stack,
    }));
  }
};

const addAssertionErrors = result => {
  const assertionErrors = extractExpectedAssertionsErrors();
  if (assertionErrors.length) {
    const jasmineErrors = assertionErrors.map(({actual, error, expected}) => ({
      actual,
      expected,
      message: error.stack,
      passed: false,
    }));
    result.status = 'failed';
    result.failedExpectations = result.failedExpectations.concat(jasmineErrors);
  }
};

const patchJasmine = () => {
  global.jasmine.Spec = (realSpec => {
    const Spec = function Spec(attr) {
      const resultCallback = attr.resultCallback;
      attr.resultCallback = function(result) {
        addSuppressedErrors(result);
        addAssertionErrors(result);
        resultCallback.call(attr, result);
      };
      const onStart = attr.onStart;
      attr.onStart = context => {
        setState({currentTestName: context.getFullName()});
        onStart && onStart.call(attr, context);
      };
      realSpec.call(this, attr);
    };

    Spec.prototype = realSpec.prototype;
    for (const statics in realSpec) {
      if (Object.prototype.hasOwnProperty.call(realSpec, statics)) {
        Spec[statics] = realSpec[statics];
      }
    }
    return Spec;
  })(global.jasmine.Spec);
};

export default ({
  config,
  globalConfig,
  localRequire,
  testPath,
}: SetupOptions) => {
  // Jest tests snapshotSerializers in order preceding built-in serializers.
  // Therefore, add in reverse because the last added is the first tested.
  config.snapshotSerializers
    .concat()
    .reverse()
    .forEach(path => {
      addSerializer(localRequire(path));
    });

  patchJasmine();
  const {expand, updateSnapshot} = globalConfig;
  const snapshotResolver = buildSnapshotResolver(config);
  const snapshotPath = snapshotResolver.resolveSnapshotPath(testPath);
  const snapshotState = new SnapshotState(snapshotPath, {
    expand,
    getBabelTraverse: () => require('@babel/traverse').default,
    getPrettier: () =>
      // $FlowFixMe dynamic require
      config.prettierPath ? require(config.prettierPath) : null,
    updateSnapshot,
  });
  setState({snapshotState, testPath});
  // Return it back to the outer scope (test runner outside the VM).
  return snapshotState;
};
