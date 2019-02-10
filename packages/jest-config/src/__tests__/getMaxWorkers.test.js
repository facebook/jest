/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import getMaxWorkers from '../getMaxWorkers';

jest.mock('os');

describe('getMaxWorkers', () => {
  beforeEach(() => {
    require('os').__setCpus({length: 4});
  });

  it('Returns 1 when runInBand', () => {
    const argv = {runInBand: true};
    expect(getMaxWorkers(argv)).toBe(1);
  });

  it('Returns 1 when the OS CPUs are not available', () => {
    require('os').__setCpus(undefined);
    expect(getMaxWorkers({})).toBe(1);
  });

  it('Returns the `maxWorkers` when specified', () => {
    const argv = {maxWorkers: 8};
    expect(getMaxWorkers(argv)).toBe(8);
  });

  it('Returns based on the number of cpus', () => {
    expect(getMaxWorkers({})).toBe(3);
    expect(getMaxWorkers({watch: true})).toBe(2);
  });

  describe('% based', () => {
    it('50% = 2 workers', () => {
      const argv = {maxWorkers: '50%'};
      expect(getMaxWorkers(argv)).toBe(2);
    });

    it('< 0 workers should become 1', () => {
      const argv = {maxWorkers: '1%'};
      expect(getMaxWorkers(argv)).toBe(1);
    });

    it("0% shouldn't break", () => {
      const argv = {maxWorkers: '0%'};
      expect(getMaxWorkers(argv)).toBe(1);
    });
  });
});
