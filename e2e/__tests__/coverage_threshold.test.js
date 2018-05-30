/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

const path = require('path');
const {cleanup, writeFiles} = require('../Utils');
const runJest = require('../runJest');

const DIR = path.resolve(__dirname, '../coverage-threshold');

beforeEach(() => {
  cleanup(DIR);
  Date.now = jest.fn(() => 1482363367071);
});
afterAll(() => {
  cleanup(DIR);
  Date.now.mockRestore();
});

const replaceTime = str => {
  return str.replace(/\d*\.?\d+m?s/g, '<<REPLACED>>');
};

test('exits with 1 if coverage threshold is not met', () => {
  const pkgJson = {
    jest: {
      collectCoverage: true,
      collectCoverageFrom: ['**/*.js'],
      coverageThreshold: {
        global: {
          lines: 90,
        },
      },
    },
  };

  writeFiles(DIR, {
    '__tests__/a-banana.js': `
      require('../not-covered.js');
      test('banana', () => expect(1).toBe(1));
    `,
    'not-covered.js': `
      module.exports = () => {
        return 1 + 2;
      };
    `,
    'package.json': JSON.stringify(pkgJson, null, 2),
  });

  const {stdout, stderr, status} = runJest(DIR, ['--coverage', '--ci=false']);
  expect(status).toBe(1);
  expect(stdout).toMatchSnapshot('stdout');
  expect(replaceTime(stderr)).toMatchSnapshot('stderr');
});

test('exits with 1 if path threshold group is not found in coverage data', () => {
  const pkgJson = {
    jest: {
      collectCoverage: true,
      collectCoverageFrom: ['**/*.js'],
      coverageThreshold: {
        'apple.js': {
          lines: 100,
        },
      },
    },
  };

  writeFiles(DIR, {
    '__tests__/banana.test.js': `
      const banana = require('../banana.js');
      test('banana', () => expect(banana()).toBe(3));
    `,
    'banana.js': `
      module.exports = () => {
        return 1 + 2;
      };
    `,
    'package.json': JSON.stringify(pkgJson, null, 2),
  });

  const {stdout, stderr, status} = runJest(DIR, ['--coverage', '--ci=false']);

  expect(status).toBe(1);
  expect(stdout).toMatchSnapshot('stdout');
  expect(replaceTime(stderr)).toMatchSnapshot('stderr');
});

test('exits with 0 if global threshold group is not found in coverage data', () => {
  const pkgJson = {
    jest: {
      collectCoverage: true,
      collectCoverageFrom: ['**/*.js'],
      coverageThreshold: {
        'banana.js': {
          lines: 100,
        },
        global: {
          lines: 100,
        },
      },
    },
  };

  writeFiles(DIR, {
    '__tests__/banana.test.js': `
      const banana = require('../banana.js');
      test('banana', () => expect(banana()).toBe(3));
    `,
    'banana.js': `
      module.exports = () => {
        return 1 + 2;
      };
    `,
    'package.json': JSON.stringify(pkgJson, null, 2),
  });

  const {stdout, status} = runJest(DIR, ['--coverage', '--ci=false']);

  expect(status).toBe(0);
  expect(stdout).toMatchSnapshot('stdout');
});

test('excludes tests matched by path threshold groups from global group', () => {
  const pkgJson = {
    jest: {
      collectCoverage: true,
      collectCoverageFrom: ['**/*.js'],
      coverageThreshold: {
        'banana.js': {
          lines: 100,
        },
        global: {
          lines: 100,
        },
      },
    },
  };

  writeFiles(DIR, {
    '__tests__/banana.test.js': `
      const banana = require('../banana.js');
      test('banana', () => expect(banana()).toBe(3));
    `,
    'apple.js': `
      module.exports = () => {
        return 1 + 2;
      };
    `,
    'banana.js': `
      module.exports = () => {
        return 1 + 2;
      };
    `,
    'package.json': JSON.stringify(pkgJson, null, 2),
  });

  const {stdout, stderr, status} = runJest(DIR, ['--coverage', '--ci=false']);

  expect(status).toBe(1);
  expect(stdout).toMatchSnapshot('stdout');
  expect(replaceTime(stderr)).toMatchSnapshot('stderr');
});

test('file is matched by all path and glob threshold groups', () => {
  const pkgJson = {
    jest: {
      collectCoverage: true,
      collectCoverageFrom: ['**/*.js'],
      coverageThreshold: {
        './': {
          lines: 100,
        },
        'ban*.js': {
          lines: 100,
        },
        'banana.js': {
          lines: 100,
        },
      },
    },
  };

  writeFiles(DIR, {
    '__tests__/banana.test.js': `
      const banana = require('../banana.js');
      test('banana', () => expect(3).toBe(3));
    `,
    'banana.js': `
      module.exports = () => {
        return 1 + 2;
      };
    `,
    'package.json': JSON.stringify(pkgJson, null, 2),
  });

  const {stdout, stderr, status} = runJest(DIR, ['--coverage', '--ci=false']);

  expect(status).toBe(1);
  expect(stdout).toMatchSnapshot('stdout');
  expect(replaceTime(stderr)).toMatchSnapshot('stderr');
});
