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
  tests                                     | timings        | detectOpenHandles | maxWorkers   | watch    | expectedResult
  ${[getTestMock()]}                        | ${[500, 500]}  | ${false}          | ${undefined} | ${true}  | ${true}
  ${getTestsMock()}                         | ${[2000, 500]} | ${false}          | ${1}         | ${true}  | ${true}
  ${getTestsMock()}                         | ${[2000, 500]} | ${false}          | ${2}         | ${true}  | ${false}
  ${[getTestMock()]}                        | ${[2000, 500]} | ${false}          | ${undefined} | ${true}  | ${false}
  ${getTestsMock()}                         | ${[500, 500]}  | ${false}          | ${undefined} | ${true}  | ${false}
  ${getTestsMock()}                         | ${[2000, 500]} | ${false}          | ${1}         | ${false} | ${true}
  ${getTestsMock()}                         | ${[2000, 500]} | ${false}          | ${2}         | ${false} | ${false}
  ${[getTestMock()]}                        | ${[2000]}      | ${false}          | ${undefined} | ${false} | ${true}
  ${getTestsMock()}                         | ${[500, 500]}  | ${false}          | ${undefined} | ${false} | ${true}
  ${new Array(45).fill(1).map(getTestMock)} | ${[500]}       | ${false}          | ${undefined} | ${false} | ${false}
  ${getTestsMock()}                         | ${[2000, 500]} | ${false}          | ${undefined} | ${false} | ${false}
  ${getTestsMock()}                         | ${[2000, 500]} | ${true}           | ${undefined} | ${false} | ${true}
`(
  'shouldRunInBand() - should return $expectedResult for runInBand mode',
  ({tests, timings, detectOpenHandles, maxWorkers, watch, expectedResult}) => {
    expect(
      shouldRunInBand(tests, timings, {detectOpenHandles, maxWorkers, watch}),
    ).toBe(expectedResult);
  },
);
