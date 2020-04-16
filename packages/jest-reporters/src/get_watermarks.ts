/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Config} from '@jest/types';
import istanbulReport = require('istanbul-lib-report');
import type {Context} from './types';

export default function getWatermarks(
  contexts: Set<Pick<Context, 'config'>>,
): istanbulReport.Watermarks {
  const defaultWatermarks = istanbulReport.getDefaultWatermarks();

  if (contexts.size !== 1) {
    return defaultWatermarks;
  }

  const firstAndOnlyContext = contexts.values().next().value;
  const {coverageThreshold} = firstAndOnlyContext.config;

  if (!coverageThreshold || !coverageThreshold.global) {
    return defaultWatermarks;
  }

  const keys: Array<keyof Config.CoverageThresholdValue> = [
    'branches',
    'functions',
    'lines',
    'statements',
  ];
  return keys.reduce((watermarks, key) => {
    const value = coverageThreshold.global[key];
    if (value !== undefined) {
      watermarks[key][1] = value;
    }

    return watermarks;
  }, defaultWatermarks);
}
