/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig} from 'types/Config';
import type {Test} from 'types/TestRunner';

import {extname} from 'path';
import pEachSeries from 'p-each-series';
import {addHook} from 'pirates';
import Runtime from 'jest-runtime';

// copied from https://github.com/babel/babel/blob/56044c7851d583d498f919e9546caddf8f80a72f/packages/babel-helpers/src/helpers.js#L558-L562
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}

export default ({
  allTests,
  globalConfig,
  moduleName,
}: {
  allTests: Array<Test>,
  globalConfig: GlobalConfig,
  moduleName: 'globalSetup' | 'globalTeardown',
}): Promise<void> => {
  const globalModulePaths = new Set(
    allTests.map(test => test.context.config[moduleName]),
  );

  if (globalConfig[moduleName]) {
    globalModulePaths.add(globalConfig[moduleName]);
  }

  if (globalModulePaths.size > 0) {
    return pEachSeries(Array.from(globalModulePaths), async modulePath => {
      if (!modulePath) {
        return;
      }

      const correctConfig = allTests.find(
        t => t.context.config[moduleName] === modulePath,
      );

      const projectConfig = correctConfig
        ? correctConfig.context.config
        : // Fallback to first config
          allTests[0].context.config;

      const transformer = new Runtime.ScriptTransformer(projectConfig);

      // Load the transformer to avoid a cycle where we need to load a
      // transformer in order to transform it in the require hooks
      transformer.preloadTransformer(modulePath);

      const revertHook = addHook(
        (code, filename) =>
          transformer.transformSource(filename, code, false).code || code,
        {
          exts: [extname(modulePath)],
          matcher: transformer._shouldTransform.bind(transformer),
        },
      );

      // $FlowFixMe
      const globalModule = _interopRequireDefault(require(modulePath)).default;

      if (typeof globalModule !== 'function') {
        throw new TypeError(
          `${moduleName} file must export a function at ${modulePath}`,
        );
      }

      await globalModule(globalConfig);

      revertHook();
    });
  }

  return Promise.resolve();
};
