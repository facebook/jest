// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

const path = require('path');
const {buildSnapshotResolver} = require('../snapshot_resolver');

describe('defaults', () => {
  let snapshotResolver;
  const projectConfig = {
    rootDir: 'default',
    // snapshotResolver: null,
  };

  beforeEach(() => {
    snapshotResolver = buildSnapshotResolver(projectConfig);
  });

  it('returns cached object if called multiple times', () => {
    expect(buildSnapshotResolver(projectConfig)).toBe(snapshotResolver);
  });

  it('resolveSnapshotPath()', () => {
    expect(snapshotResolver.resolveSnapshotPath('/abc/cde/a.test.js')).toBe(
      path.join('/abc', 'cde', '__snapshots__', 'a.test.js.snap'),
    );
  });

  it('resolveTestPath()', () => {
    expect(
      snapshotResolver.resolveTestPath('/abc/cde/__snapshots__/a.test.js.snap'),
    ).toBe(path.resolve('/abc/cde/a.test.js'));
  });
});

describe('custom resolver in project config', () => {
  let snapshotResolver;
  const customSnapshotResolverFile = path.join(
    __dirname,
    'fixtures',
    'customSnapshotResolver.js',
  );
  const projectConfig = {
    rootDir: 'custom1',
    snapshotResolver: customSnapshotResolverFile,
  };

  beforeEach(() => {
    snapshotResolver = buildSnapshotResolver(projectConfig);
  });

  it('returns cached object if called multiple times', () => {
    expect(buildSnapshotResolver(projectConfig)).toBe(snapshotResolver);
  });

  it('resolveSnapshotPath()', () => {
    expect(
      snapshotResolver.resolveSnapshotPath(
        path.resolve('/abc/cde/__tests__/a.test.js'),
      ),
    ).toBe(path.resolve('/abc/cde/__snapshots__/a.test.js.snap'));
  });

  it('resolveTestPath()', () => {
    expect(
      snapshotResolver.resolveTestPath(
        path.resolve('/abc', 'cde', '__snapshots__', 'a.test.js.snap'),
      ),
    ).toBe(path.resolve('/abc/cde/__tests__/a.test.js'));
  });
});

describe('malformed custom resolver in project config', () => {
  const newProjectConfig = (filename: string) => {
    const customSnapshotResolverFile = path.join(
      __dirname,
      'fixtures',
      filename,
    );
    return {
      rootDir: 'missing-resolveSnapshotPath',
      snapshotResolver: customSnapshotResolverFile,
    };
  };

  it('missing resolveSnapshotPath throws ', () => {
    const projectConfig = newProjectConfig(
      'customSnapshotResolver-missing-resolveSnapshotPath.js',
    );
    expect(() => {
      buildSnapshotResolver(projectConfig);
    }).toThrowErrorMatchingSnapshot();
  });

  it('missing resolveTestPath throws ', () => {
    const projectConfig = newProjectConfig(
      'customSnapshotResolver-missing-resolveTestPath.js',
    );
    expect(() => {
      buildSnapshotResolver(projectConfig);
    }).toThrowErrorMatchingSnapshot();
  });

  it('missing testPathForConsistencyCheck throws ', () => {
    const projectConfig = newProjectConfig(
      'customSnapshotResolver-missing-test-path-for-consistency-check.js',
    );
    expect(() => {
      buildSnapshotResolver(projectConfig);
    }).toThrowErrorMatchingSnapshot();
  });

  it('inconsistent functions throws ', () => {
    const projectConfig = newProjectConfig(
      'customSnapshotResolver-inconsistent-fns.js',
    );
    expect(() => {
      buildSnapshotResolver(projectConfig);
    }).toThrowErrorMatchingSnapshot();
  });
});
