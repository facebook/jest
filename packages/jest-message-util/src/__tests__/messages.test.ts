/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {formatExecError, formatResultsErrors} from '..';

const unixStackTrace =
  `  ` +
  `at stack (../jest-jasmine2/build/jasmine-2.4.1.js:1580:17)
  at Object.addResult (../jest-jasmine2/build/jasmine-2.4.1.js:1550:14)
  at jasmine.addResult (../jest-jasmine2/build/index.js:82:44)
  at Spec.Env.factory (../jest-jasmine2/build/jasmine-2.4.1.js:641:18)
  at Spec.addResult (../jest-jasmine2/build/jasmine-2.4.1.js:333:34)
  at Expectation.addResult (../jest-jasmine2/build/jasmine-2.4.1.js:591:21)
  at Expectation.toBe (../jest-jasmine2/build/jasmine-2.4.1.js:1504:12)
  at Object.it (build/__tests__/messages-test.js:45:41)
  at Object.<anonymous> (../jest-jasmine2/build/jasmine-pit.js:35:32)
  at attemptAsync (../jest-jasmine2/build/jasmine-2.4.1.js:1919:24)`;

const assertionStack =
  '  ' +
  `
    Expected value to be of type:
      "number"
    Received:
      ""
    type:
      "string"

      at Object.it (__tests__/test.js:8:14)
      at Object.asyncFn (node_modules/jest-jasmine2/build/jasmine_async.js:124:345)
      at resolve (node_modules/jest-jasmine2/build/queue_runner.js:46:12)
          at Promise (<anonymous>)
      at mapper (node_modules/jest-jasmine2/build/queue_runner.js:34:499)
      at promise.then (node_modules/jest-jasmine2/build/queue_runner.js:74:39)
          at <anonymous>
      at process._tickCallback (internal/process/next_tick.js:188:7)
      at internal/process/next_tick.js:188:7
`;

const vendorStack =
  '  ' +
  `
    Expected value to be of type:
      "number"
    Received:
      ""
    type:
      "string"

      at Object.it (__tests__/vendor/cool_test.js:6:666)
      at Object.asyncFn (__tests__/vendor/sulu/node_modules/sulu-content-bundle/best_component.js:1:5)
`;

const babelStack =
  '  ' +
  `
    packages/react/src/forwardRef.js: Unexpected token, expected , (20:10)
    \u001b[0m \u001b[90m 18 | \u001b[39m        \u001b[36mfalse\u001b[39m\u001b[33m,\u001b[39m
     \u001b[90m 19 | \u001b[39m        \u001b[32m'forwardRef requires a render function but received a \`memo\` '\u001b[39m 
    \u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m 20 | \u001b[39m          \u001b[32m'component. Instead of forwardRef(memo(...)), use '\u001b[39m \u001b[33m+\u001b[39m
     \u001b[90m    | \u001b[39m          \u001b[31m\u001b[1m^\u001b[22m\u001b[39m
     \u001b[90m 21 | \u001b[39m          \u001b[32m'memo(forwardRef(...)).'\u001b[39m\u001b[33m,\u001b[39m
     \u001b[90m 22 | \u001b[39m      )\u001b[33m;\u001b[39m
     \u001b[90m 23 | \u001b[39m    } \u001b[36melse\u001b[39m \u001b[36mif\u001b[39m (\u001b[36mtypeof\u001b[39m render \u001b[33m!==\u001b[39m \u001b[32m'function'\u001b[39m) {\u001b[0m
`;

it('should exclude jasmine from stack trace for Unix paths.', () => {
  const messages = formatResultsErrors(
    [
      {
        ancestorTitles: [],
        failureMessages: [unixStackTrace],
        fullName: 'full name',
        location: null,
        numPassingAsserts: 0,
        status: 'failed',
        title: 'Unix test',
      },
    ],
    {
      rootDir: '',
      testMatch: [],
    },
    {
      noStackTrace: false,
    },
  );

  expect(messages).toMatchSnapshot();
});

it('.formatExecError()', () => {
  const message = formatExecError(
    {
      message: 'Whoops!',
      stack: '',
    },
    {
      rootDir: '',
      testMatch: [],
    },
    {
      noStackTrace: false,
    },
    'path_test',
  );

  expect(message).toMatchSnapshot();
});

it('formatStackTrace should strip node internals', () => {
  const messages = formatResultsErrors(
    [
      {
        ancestorTitles: [],
        failureMessages: [assertionStack],
        fullName: 'full name',
        location: null,
        numPassingAsserts: 0,
        status: 'failed',
        title: 'Unix test',
      },
    ],
    {
      rootDir: '',
      testMatch: [],
    },
    {
      noStackTrace: false,
    },
  );

  expect(messages).toMatchSnapshot();
});

it('should not exclude vendor from stack trace', () => {
  const messages = formatResultsErrors(
    [
      {
        ancestorTitles: [],
        failureMessages: [vendorStack],
        fullName: 'full name',
        location: null,
        numPassingAsserts: 0,
        status: 'failed',
        title: 'Vendor test',
      },
    ],
    {
      rootDir: '',
      testMatch: [],
    },
    {
      noStackTrace: false,
    },
  );

  expect(messages).toMatchSnapshot();
});

it('retains message in babel code frame error', () => {
  const messages = formatResultsErrors(
    [
      {
        ancestorTitles: [],
        failureMessages: [babelStack],
        fullName: 'full name',
        location: null,
        numPassingAsserts: 0,
        status: 'failed',
        title: 'Babel test',
      },
    ],
    {
      rootDir: '',
      testMatch: [],
    },
    {
      noStackTrace: false,
    },
  );

  expect(messages).toMatchSnapshot();
});
