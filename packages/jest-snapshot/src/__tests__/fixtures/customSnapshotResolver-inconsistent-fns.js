// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

module.exports = {
  resolveSnapshotPath: (testPath, snapshotExtension) =>
    testPath.replace('__tests__', '__snapshots__') + snapshotExtension,

  resolveTestPath: (snapshotFilePath, snapshotExtension) =>
    snapshotFilePath
      .replace('__snapshots__', '__SPECS__')
      .slice(0, -snapshotExtension.length),

  testPathForConsistencyCheck: 'foo/__tests__/bar.test.js',
};
