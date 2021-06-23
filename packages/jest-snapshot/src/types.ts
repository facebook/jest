/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/ban-types-eventually */

import type {MatcherState} from 'expect';
import type SnapshotState from './State';

export type Context = MatcherState & {
  snapshotState: SnapshotState;
};

export type MatchSnapshotConfig = {
  context: Context;
  hint?: string;
  inlineSnapshot?: string;
  isInline: boolean;
  matcherName: string;
  snapshotName?: string;
  properties?: object;
  received: any;
};

export type SnapshotNameConfig = {
  hint?: string;
  snapshotName?: string;
  currentTestName?: string;
};

export type SnapshotData = Record<string, string>;

// copied from `expect` - should be shared
export type ExpectationResult = {
  pass: boolean;
  message: () => string;
};
