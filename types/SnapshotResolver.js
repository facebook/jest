// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

import type {Path} from './Config';

export type SnapshotResolver = {|
  testPathForConsistencyCheck: string,
  resolveSnapshotPath(testPath: Path): Path,
  resoveTestPath(snapshotPath: Path): Path,
|};
