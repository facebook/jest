/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

import {shouldRunInBand} from '../testSchedulerHelper';

const getTestMock = () => ({
  context: {
    config: {
      runner: 'jest-runner-parallel',
    },
    hasteFS: {
      matchFiles: jest.fn(() => []),
    },
  },
  path: './test/path.js',
});

const getTestsMock = () => [getTestMock(), getTestMock()];

test.each`
  tests              | watch    | maxWorkers   | timings        | expectedResult
  ${[getTestMock()]} | ${true}  | ${undefined} | ${[500, 500]}  | ${true}
  ${getTestsMock()}  | ${true}  | ${1}         | ${[2000, 500]} | ${true}
  ${getTestsMock()}  | ${true}  | ${2}         | ${[2000, 500]} | ${false}
  ${[getTestMock()]} | ${true}  | ${undefined} | ${[2000, 500]} | ${false}
  ${getTestMock()}   | ${true}  | ${undefined} | ${[500, 500]}  | ${false}
  ${getTestsMock()}  | ${false} | ${1}         | ${[2000, 500]} | ${true}
  ${getTestMock()}   | ${false} | ${2}         | ${[2000, 500]} | ${false}
  ${[getTestMock()]} | ${false} | ${undefined} | ${[2000]}      | ${true}
  ${getTestsMock()}  | ${false} | ${undefined} | ${[500, 500]}  | ${true}
  ${new Array(45)}   | ${false} | ${undefined} | ${[500]}       | ${false}
  ${getTestsMock()}  | ${false} | ${undefined} | ${[2000, 500]} | ${false}
`(
  'shouldRunInBand() - should return $expectedResult for runInBand mode',
  ({tests, watch, maxWorkers, timings, expectedResult}) => {
    expect(shouldRunInBand(tests, watch, maxWorkers, timings)).toBe(
      expectedResult,
    );
  },
);
