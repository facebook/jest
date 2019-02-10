/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import {extractSummary} from '../Utils';
import runJest from '../runJest';
import {wrap} from 'jest-snapshot-serializer-raw';

const dir = path.resolve(__dirname, '../failures');

const normalizeDots = text => text.replace(/\.{1,}$/gm, '.');

function cleanStderr(stderr) {
  const {rest} = extractSummary(stderr);
  return rest
    .replace(/.*(jest-jasmine2|jest-circus).*\n/g, '')
    .replace(new RegExp('Failed: Object {', 'g'), 'thrown: Object {');
}

test('not throwing Error objects', () => {
  let stderr;
  stderr = runJest(dir, ['throwNumber.test.js']).stderr;
  expect(wrap(cleanStderr(stderr))).toMatchSnapshot();
  stderr = runJest(dir, ['throwString.test.js']).stderr;
  expect(wrap(cleanStderr(stderr))).toMatchSnapshot();
  stderr = runJest(dir, ['throwObject.test.js']).stderr;
  expect(wrap(cleanStderr(stderr))).toMatchSnapshot();
  stderr = runJest(dir, ['assertionCount.test.js']).stderr;
  expect(wrap(cleanStderr(stderr))).toMatchSnapshot();
  stderr = runJest(dir, ['duringTests.test.js']).stderr;
  expect(wrap(cleanStderr(stderr))).toMatchSnapshot();
});

test('works with node assert', () => {
  const nodeMajorVersion = Number(process.versions.node.split('.')[0]);
  const {stderr} = runJest(dir, ['assertionError.test.js']);
  let summary = normalizeDots(cleanStderr(stderr));

  // Node 9 started to include the error for `doesNotThrow`
  // https://github.com/nodejs/node/pull/12167
  if (nodeMajorVersion >= 9) {
    expect(summary).toContain(`
    assert.doesNotThrow(function)

    Expected the function not to throw an error.
    Instead, it threw:
      [Error: err!]

    Message:
      Got unwanted exception.
`);

    expect(summary).toContain(`
      69 | 
      70 | test('assert.doesNotThrow', () => {
    > 71 |   assert.doesNotThrow(() => {
         |          ^
      72 |     throw Error('err!');
      73 |   });
      74 | });

      at Object.doesNotThrow (__tests__/assertionError.test.js:71:10)
`);

    const commonErrorMessage = `Message:
      Got unwanted exception.
`;

    if (nodeMajorVersion === 9) {
      const specificErrorMessage = `Message:
      Got unwanted exception.
    err!
`;

      expect(summary).toContain(specificErrorMessage);
      summary = summary.replace(specificErrorMessage, commonErrorMessage);
    } else {
      const specificErrorMessage = `Message:
      Got unwanted exception.
    Actual message: "err!"
`;

      expect(summary).toContain(specificErrorMessage);
      summary = summary.replace(specificErrorMessage, commonErrorMessage);
    }
  }

  if (nodeMajorVersion >= 10) {
    const ifErrorMessage = `
    assert.ifError(received, expected)

    Expected value ifError to:
      null
    Received:
      1

    Message:
      ifError got unwanted exception: 1

    Difference:

      Comparing two different types of values. Expected null but received number.

      65 | 
      66 | test('assert.ifError', () => {
    > 67 |   assert.ifError(1);
         |          ^
      68 | });
      69 | 
      70 | test('assert.doesNotThrow', () => {

      at Object.ifError (__tests__/assertionError.test.js:67:10)
`;

    expect(summary).toContain(ifErrorMessage);
    summary = summary.replace(ifErrorMessage, '');
  } else {
    const ifErrorMessage = `
    thrown: 1

      64 | });
      65 | 
    > 66 | test('assert.ifError', () => {
         | ^
      67 |   assert.ifError(1);
      68 | });
      69 | 

      at Object.test (__tests__/assertionError.test.js:66:1)
`;

    expect(summary).toContain(ifErrorMessage);
    summary = summary.replace(ifErrorMessage, '');
  }

  expect(wrap(summary)).toMatchSnapshot();
});

test('works with assertions in separate files', () => {
  const {stderr} = runJest(dir, ['testMacro.test.js']);

  expect(wrap(normalizeDots(cleanStderr(stderr)))).toMatchSnapshot();
});

test('works with async failures', () => {
  const {stderr} = runJest(dir, ['asyncFailures.test.js']);

  const rest = cleanStderr(stderr)
    .split('\n')
    .filter(line => line.indexOf('packages/expect/build/index.js') === -1)
    .join('\n');

  // Remove replacements when jasmine is gone
  const result = normalizeDots(rest)
    .replace(/.*thrown:.*\n/, '')
    .replace(/.*Use jest\.setTimeout\(newTimeout\).*/, '<REPLACED>')
    .replace(/.*Timeout - Async callback was not.*/, '<REPLACED>');

  expect(wrap(result)).toMatchSnapshot();
});

test('works with snapshot failures', () => {
  const {stderr} = runJest(dir, ['snapshot.test.js']);

  const result = normalizeDots(cleanStderr(stderr));

  expect(
    wrap(result.substring(0, result.indexOf('Snapshot Summary'))),
  ).toMatchSnapshot();
});

test('works with named snapshot failures', () => {
  const {stderr} = runJest(dir, ['snapshotNamed.test.js']);

  const result = normalizeDots(cleanStderr(stderr));

  expect(
    wrap(result.substring(0, result.indexOf('Snapshot Summary'))),
  ).toMatchSnapshot();
});
