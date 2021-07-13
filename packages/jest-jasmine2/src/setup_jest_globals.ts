/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Config, Global} from '@jest/types';
import {extractExpectedAssertionsErrors, getState, setState} from 'expect';
import {
  SnapshotState,
  SnapshotStateType,
  addSerializer,
  buildSnapshotResolver,
} from 'jest-snapshot';
import type {Plugin} from 'pretty-format';
import type {
  Attributes,
  default as JasmineSpec,
  SpecResult,
} from './jasmine/Spec';
import type {Jasmine} from './types';

declare const global: Global.Global;

export type SetupOptions = {
  config: Config.ProjectConfig;
  globalConfig: Config.GlobalConfig;
  localRequire: (moduleName: string) => Plugin;
  testPath: Config.Path;
};

// Get suppressed errors form  jest-matchers that weren't throw during
// test execution and add them to the test result, potentially failing
// a passing test.
const addSuppressedErrors = (result: SpecResult) => {
  const {suppressedErrors} = getState();
  setState({suppressedErrors: []});
  if (suppressedErrors.length) {
    result.status = 'failed';

    result.failedExpectations = suppressedErrors.map(error => ({
      actual: '',
      // passing error for custom test reporters
      error,
      expected: '',
      matcherName: '',
      message: error.message,
      passed: false,
      stack: error.stack,
    }));
  }
};

const addAssertionErrors = (result: SpecResult) => {
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
  (global.jasmine as Jasmine).Spec = (realSpec => {
    class Spec extends realSpec {
      constructor(attr: Attributes) {
        const resultCallback = attr.resultCallback;
        attr.resultCallback = function (result: SpecResult) {
          addSuppressedErrors(result);
          addAssertionErrors(result);
          resultCallback.call(attr, result);
        };
        const onStart = attr.onStart;
        attr.onStart = (context: JasmineSpec) => {
          setState({currentTestName: context.getFullName()});
          onStart && onStart.call(attr, context);
        };
        super(attr);
      }
    }

    return Spec;
  })((global.jasmine as Jasmine).Spec);
};

export default async ({
  config,
  globalConfig,
  localRequire,
  testPath,
}: SetupOptions): Promise<SnapshotStateType> => {
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
  const {prettierPath, inlineSnapshotFormat, snapshotFormat} = config;
  const snapshotResolver = await buildSnapshotResolver(config, localRequire);
  const snapshotPath = snapshotResolver.resolveSnapshotPath(testPath);
  const snapshotState = new SnapshotState(snapshotPath, {
    expand,
    inlineSnapshotFormat,
    prettierPath,
    snapshotFormat,
    updateSnapshot,
  });
  // @ts-expect-error: snapshotState is a jest extension of `expect`
  setState({snapshotState, testPath});
  // Return it back to the outer scope (test runner outside the VM).
  return snapshotState;
};
