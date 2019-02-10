/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import fs from 'fs';
import path from 'path';
import {extractSummary} from '../Utils';
import runJest, {json as runWithJson} from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

const emptyTest = 'describe("", () => {it("", () => {})})';
const snapshotDir = path.resolve(
  __dirname,
  '../snapshot/__tests__/__snapshots__',
);
const snapshotFile = path.resolve(snapshotDir, 'snapshot.test.js.snap');
const secondSnapshotFile = path.resolve(
  snapshotDir,
  'secondSnapshot.test.js.snap',
);
const snapshotOfCopy = path.resolve(snapshotDir, 'snapshot.test_copy.js.snap');
const originalTestPath = path.resolve(
  __dirname,
  '../snapshot/__tests__/snapshot.test.js',
);
const originalTestContent = fs.readFileSync(originalTestPath, 'utf8');
const copyOfTestPath = originalTestPath.replace(/\.js$/, '_copy.js');

const snapshotEscapeDir = path.resolve(
  __dirname,
  '../snapshot-escape/__tests__/',
);
const snapshotEscapeTestFile = path.resolve(
  snapshotEscapeDir,
  'snapshot.test.js',
);
const snapshotEscapeSnapshotDir = path.resolve(
  snapshotEscapeDir,
  '__snapshots__',
);
const snapshotEscapeFile = path.resolve(
  snapshotEscapeSnapshotDir,
  'snapshot.test.js.snap',
);
const snapshotEscapeRegexFile = path.resolve(
  snapshotEscapeSnapshotDir,
  'snapshotEscapeRegex.js.snap',
);
const snapshotEscapeSubstitutionFile = path.resolve(
  snapshotEscapeSnapshotDir,
  'snapshotEscapeSubstitution.test.js.snap',
);

const initialTestData = fs.readFileSync(snapshotEscapeTestFile, 'utf8');

const fileExists = filePath => {
  try {
    return fs.statSync(filePath).isFile();
  } catch (e) {}
  return false;
};
const getSnapshotOfCopy = () => {
  const exports = Object.create(null);
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(snapshotOfCopy, 'utf8'));
  return exports;
};

describe('Snapshot', () => {
  const cleanup = () => {
    [
      snapshotFile,
      secondSnapshotFile,
      snapshotOfCopy,
      copyOfTestPath,
      snapshotEscapeFile,
      snapshotEscapeRegexFile,
      snapshotEscapeSubstitutionFile,
    ].forEach(file => {
      if (fileExists(file)) {
        fs.unlinkSync(file);
      }
    });
    if (fileExists(snapshotDir)) {
      fs.rmdirSync(snapshotDir);
    }
    if (fileExists(snapshotEscapeSnapshotDir)) {
      fs.rmdirSync(snapshotEscapeSnapshotDir);
    }

    fs.writeFileSync(snapshotEscapeTestFile, initialTestData, 'utf8');
  };

  beforeEach(cleanup);
  afterAll(cleanup);

  it('stores new snapshots on the first run', () => {
    const result = runWithJson('snapshot', ['-w=1', '--ci=false']);
    const json = result.json;

    expect(json.numTotalTests).toBe(5);
    expect(json.numPassedTests).toBe(5);
    expect(json.numFailedTests).toBe(0);
    expect(json.numPendingTests).toBe(0);
    expect(result.status).toBe(0);

    // $FlowFixMe dynamic require
    const content = require(snapshotFile);
    expect(
      content['snapshot is not influenced by previous counter 1'],
    ).not.toBeUndefined();

    expect(result.stderr).toMatch('5 snapshots written from 2 test suites');
    expect(wrap(extractSummary(result.stderr).summary)).toMatchSnapshot();
  });

  it('works with escaped characters', () => {
    // Write the first snapshot
    let result = runJest('snapshot-escape', [
      '-w=1',
      '--ci=false',
      'snapshot.test.js',
    ]);
    let stderr = result.stderr;

    expect(stderr).toMatch('1 snapshot written');
    expect(result.status).toBe(0);
    expect(wrap(extractSummary(stderr).summary)).toMatchSnapshot();

    // Write the second snapshot
    const testData =
      `test('escape strings two', () => expect('two: \\\'\"').` +
      `toMatchSnapshot());`;
    const newTestData = initialTestData + testData;
    fs.writeFileSync(snapshotEscapeTestFile, newTestData, 'utf8');

    result = runJest('snapshot-escape', [
      '-w=1',
      '--ci=false',
      '--updateSnapshot',
      'snapshot.test.js',
    ]);
    stderr = result.stderr;

    expect(stderr).toMatch('1 snapshot written');
    expect(wrap(extractSummary(stderr).summary)).toMatchSnapshot();
    expect(result.status).toBe(0);

    // Now let's check again if everything still passes.
    // If this test doesn't pass, some snapshot data was not properly escaped.
    result = runJest('snapshot-escape', [
      '-w=1',
      '--ci=false',
      'snapshot.test.js',
    ]);
    stderr = result.stderr;

    expect(stderr).not.toMatch('Snapshot Summary');
    expect(wrap(extractSummary(stderr).summary)).toMatchSnapshot();
    expect(result.status).toBe(0);
  });

  it('works with escaped regex', () => {
    // Write the first snapshot
    let result = runJest('snapshot-escape', [
      '-w=1',
      '--ci=false',
      'snapshotEscapeRegex.js',
    ]);
    let stderr = result.stderr;

    expect(stderr).toMatch('2 snapshots written from 1 test suite.');
    expect(result.status).toBe(0);
    expect(wrap(extractSummary(stderr).summary)).toMatchSnapshot();

    result = runJest('snapshot-escape', [
      '-w=1',
      '--ci=false',
      'snapshotEscapeRegex.js',
    ]);
    stderr = result.stderr;

    // Make sure we aren't writing a snapshot this time which would
    // indicate that the snapshot couldn't be loaded properly.
    expect(stderr).not.toMatch('Snapshot Summary');
    expect(wrap(extractSummary(stderr).summary)).toMatchSnapshot();
    expect(result.status).toBe(0);
  });

  it('works with template literal substitutions', () => {
    // Write the first snapshot
    let result = runJest('snapshot-escape', [
      '-w=1',
      '--ci=false',
      'snapshotEscapeSubstitution.test.js',
    ]);
    let stderr = result.stderr;

    expect(stderr).toMatch('1 snapshot written');
    expect(result.status).toBe(0);
    expect(wrap(extractSummary(stderr).summary)).toMatchSnapshot();

    result = runJest('snapshot-escape', [
      '-w=1',
      '--ci=false',
      'snapshotEscapeSubstitution.test.js',
    ]);
    stderr = result.stderr;

    // Make sure we aren't writing a snapshot this time which would
    // indicate that the snapshot couldn't be loaded properly.
    expect(stderr).not.toMatch('1 snapshot written');
    expect(wrap(extractSummary(stderr).summary)).toMatchSnapshot();
    expect(result.status).toBe(0);
  });

  describe('Validation', () => {
    beforeEach(() => {
      fs.writeFileSync(copyOfTestPath, originalTestContent);
    });

    it('does not save snapshots in CI mode by default', () => {
      const result = runWithJson('snapshot', ['-w=1', '--ci=true']);

      expect(result.json.success).toBe(false);
      expect(result.json.numTotalTests).toBe(9);
      expect(result.json.snapshot.added).toBe(0);
      expect(result.json.snapshot.total).toBe(9);
      const {rest, summary} = extractSummary(result.stderr);

      expect(rest).toMatch('New snapshot was not written');
      expect(wrap(summary)).toMatchSnapshot();
    });

    it('works on subsequent runs without `-u`', () => {
      const firstRun = runWithJson('snapshot', ['-w=1', '--ci=false']);

      // $FlowFixMe dynamic require
      const content = require(snapshotOfCopy);
      expect(content).not.toBe(undefined);
      const secondRun = runWithJson('snapshot', []);

      expect(firstRun.json.numTotalTests).toBe(9);
      expect(secondRun.json.numTotalTests).toBe(9);
      expect(secondRun.json.success).toBe(true);

      expect(firstRun.stderr).toMatch('9 snapshots written from 3 test suites');
      expect(secondRun.stderr).toMatch('9 passed, 9 total');
      expect(wrap(extractSummary(firstRun.stderr).summary)).toMatchSnapshot();
      expect(wrap(extractSummary(secondRun.stderr).summary)).toMatchSnapshot();
    });

    it('deletes the snapshot if the test suite has been removed', () => {
      const firstRun = runWithJson('snapshot', ['-w=1', '--ci=false']);
      fs.unlinkSync(copyOfTestPath);

      // $FlowFixMe dynamic require
      const content = require(snapshotOfCopy);
      expect(content).not.toBe(undefined);
      const secondRun = runWithJson('snapshot', ['-w=1', '--ci=false', '-u']);

      expect(firstRun.json.numTotalTests).toBe(9);
      expect(secondRun.json.numTotalTests).toBe(5);
      expect(fileExists(snapshotOfCopy)).toBe(false);

      expect(firstRun.stderr).toMatch('9 snapshots written from 3 test suites');
      expect(secondRun.stderr).toMatch(
        '1 snapshot file removed from 1 test suite',
      );
      expect(wrap(extractSummary(firstRun.stderr).summary)).toMatchSnapshot();
      expect(wrap(extractSummary(secondRun.stderr).summary)).toMatchSnapshot();
    });

    it('deletes a snapshot when a test does removes all the snapshots', () => {
      const firstRun = runWithJson('snapshot', ['-w=1', '--ci=false']);

      fs.writeFileSync(copyOfTestPath, emptyTest);
      const secondRun = runWithJson('snapshot', ['-w=1', '--ci=false', '-u']);
      fs.unlinkSync(copyOfTestPath);

      expect(firstRun.json.numTotalTests).toBe(9);
      expect(secondRun.json.numTotalTests).toBe(6);

      expect(fileExists(snapshotOfCopy)).toBe(false);
      expect(firstRun.stderr).toMatch('9 snapshots written from 3 test suites');
      expect(secondRun.stderr).toMatch(
        '1 snapshot file removed from 1 test suite',
      );
      expect(wrap(extractSummary(firstRun.stderr).summary)).toMatchSnapshot();
      expect(wrap(extractSummary(secondRun.stderr).summary)).toMatchSnapshot();
    });

    it('updates the snapshot when a test removes some snapshots', () => {
      const firstRun = runWithJson('snapshot', ['-w=1', '--ci=false']);
      fs.unlinkSync(copyOfTestPath);
      const beforeRemovingSnapshot = getSnapshotOfCopy();

      fs.writeFileSync(
        copyOfTestPath,
        originalTestContent.replace(
          '.toMatchSnapshot()',
          '.not.toBe(undefined)',
        ),
      );
      const secondRun = runWithJson('snapshot', ['-w=1', '--ci=false', '-u']);
      fs.unlinkSync(copyOfTestPath);

      expect(firstRun.json.numTotalTests).toBe(9);
      expect(secondRun.json.numTotalTests).toBe(9);
      expect(fileExists(snapshotOfCopy)).toBe(true);
      const afterRemovingSnapshot = getSnapshotOfCopy();

      expect(Object.keys(beforeRemovingSnapshot).length - 1).toBe(
        Object.keys(afterRemovingSnapshot).length,
      );
      const keyToCheck =
        'snapshot works with plain objects and the ' +
        'title has `escape` characters 2';
      expect(beforeRemovingSnapshot[keyToCheck]).not.toBe(undefined);
      expect(afterRemovingSnapshot[keyToCheck]).toBe(undefined);

      expect(wrap(extractSummary(firstRun.stderr).summary)).toMatchSnapshot();
      expect(firstRun.stderr).toMatch('9 snapshots written from 3 test suites');

      expect(wrap(extractSummary(secondRun.stderr).summary)).toMatchSnapshot();
      expect(secondRun.stderr).toMatch('1 snapshot updated from 1 test suite');
      expect(secondRun.stderr).toMatch('1 snapshot removed from 1 test suite');
    });
  });
});
